import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { test as appTest } from './app.fixture';
import { allowedBaseUrl } from '../support/environment';
import { branchName, identity, runId } from '../support/run-context';

export interface AuthContext {
  token: string;
  userId: string;
  role: string;
  username: string;
}

export interface BranchRef {
  id: string;
  name: string;
}

export const ADMIN = {
  username: 'admin',
  password: 'password123',
};

export const RUN_PASSWORD = 'password123';

// POST /api/users rejects a phone number that matches an existing user, so every
// run-scoped staff account derives a distinct numeric value from run id + suffix.
function runScopedPhoneNumber(suffix: string): string {
  const seed = `${runId()}-${suffix}`;
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 10_000_000;
  return `555${hash.toString().padStart(7, '0')}`;
}

export async function apiLogin(request: APIRequestContext, username: string, password: string): Promise<AuthContext> {
  const response = await request.post('/api/auth/login', { data: { username, password } });
  if (!response.ok()) throw new Error(`API login failed for ${username}: ${response.status()}`);
  const authorization = response.headers()['authorization'];
  if (!authorization) throw new Error(`API login for ${username} returned no Authorization header`);
  const body = await response.json();
  return {
    token: authorization.replace(/^Bearer\s+/i, ''),
    userId: body.data.id,
    role: body.data.role,
    username,
  };
}

export async function apiRegister(
  request: APIRequestContext,
  username: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  const response = await request.post('/api/auth/register', {
    data: {
      firstName,
      lastName,
      email: username,
      password,
      phoneNumber: '',
      membershipId: '',
    },
  });
  if (!response.ok() && response.status() !== 400) {
    throw new Error(`API register failed for ${username}: ${response.status()}`);
  }
}

export async function ensureUser(
  request: APIRequestContext,
  username: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<AuthContext> {
  try {
    return await apiLogin(request, username, password);
  } catch {
    await apiRegister(request, username, password, firstName, lastName);
    return apiLogin(request, username, password);
  }
}

export async function getAdmin(request: APIRequestContext): Promise<AuthContext> {
  const context = await apiLogin(request, ADMIN.username, ADMIN.password);
  if (context.role !== 'ADMIN') {
    throw new Error(
      `${ADMIN.username} has role ${context.role}, not ADMIN. Check the committed V3 seed account.`,
    );
  }
  return context;
}

export async function authedGet(request: APIRequestContext, path: string, auth: AuthContext) {
  return request.get(`/api${path}`, { headers: { Authorization: `Bearer ${auth.token}` } });
}

export async function authedPost(request: APIRequestContext, path: string, auth: AuthContext, data?: unknown) {
  return request.post(`/api${path}`, { headers: { Authorization: `Bearer ${auth.token}` }, data });
}

export async function ensureBranch(request: APIRequestContext, admin: AuthContext): Promise<BranchRef> {
  const list = async (): Promise<Array<{ id: string; name: string }>> => {
    const response = await authedGet(request, '/branches', admin);
    if (!response.ok()) throw new Error(`GET /branches failed: ${response.status()}`);
    return ((await response.json()) as { data: Array<{ id: string; name: string }> }).data;
  };
  const existing = (await list()).find((branch) => branch.name === branchName());
  if (existing) return { id: existing.id, name: existing.name };
  const created = await authedPost(request, '/branches', admin, {
    name: branchName(),
    address: 'Created by the UI test run',
    phone: '',
    email: '',
  });
  if (!created.ok()) throw new Error(`Branch creation failed: ${created.status()}`);
  const branch = (await list()).find((candidate) => candidate.name === branchName());
  if (!branch) throw new Error(`Branch ${branchName()} was created but not found in GET /branches`);
  return { id: branch.id, name: branch.name };
}

export async function authedPut(request: APIRequestContext, path: string, auth: AuthContext, data?: unknown) {
  return request.put(`/api${path}`, { headers: { Authorization: `Bearer ${auth.token}` }, data });
}

export interface CategoryRef {
  id: string;
  name: string;
}

export interface BookRef {
  id: string;
  title: string;
}

export interface CopyRef {
  id: string;
  barcode: string;
}

export async function createRunUser(
  request: APIRequestContext,
  admin: AuthContext,
  suffix: string,
  role = 'MEMBER',
  branch?: BranchRef,
): Promise<AuthContext> {
  const email = identity(suffix);
  const phoneSeed = [...`${email}-phone`].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 10_000_000, 7);
  const response = await authedPost(request, '/users', admin, {
    membershipId: `PW${String([...`${email}-mid`].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 10_000_000, 7)).padStart(6, '0')}`,
    firstName: 'PW',
    lastName: suffix,
    phoneNumber: `555-${String(phoneSeed).padStart(7, '0')}`,
    emailId: email,
    role,
    membershipType: 'PUBLIC',
    branchId: branch?.id ?? null,
    password: 'password123',
  });
  if (!response.ok()) throw new Error(`User creation failed for ${suffix}: ${response.status()}`);
  return apiLogin(request, email, 'password123');
}

/** Column-safe run-scoped ISBN: `books.isbn` is VARCHAR(13); `identity()` strings are far longer. */
export function runScopedIsbn(seed: string): string {
  let hash = 0;
  for (const char of identity(seed)) hash = (hash * 31 + char.charCodeAt(0)) % 1_000_000;
  return `PW${String(hash).padStart(6, '0')}`;
}

export async function ensureCategory(request: APIRequestContext, auth: AuthContext, name: string): Promise<CategoryRef> {
  const listed = await authedGet(request, '/categories', auth);
  if (!listed.ok()) throw new Error(`GET /categories failed: ${listed.status()}`);
  const before = (await listed.json()) as { data: CategoryRef[] };
  const existing = before.data.find((category) => category.name === name);
  if (existing) return existing;

  const created = await authedPost(request, '/categories', auth, { name, parentId: null });
  if (!created.ok()) throw new Error(`Category creation failed for ${name}: ${created.status()}`);

  const after = (await (await authedGet(request, '/categories', auth)).json()) as { data: CategoryRef[] };
  const category = after.data.find((entry) => entry.name === name);
  if (!category) throw new Error(`Category ${name} is missing after creation`);
  return category;
}

export async function ensureBook(
  request: APIRequestContext,
  auth: AuthContext,
  input: { title: string; author: string; isbn?: string; categoryId?: string | null },
): Promise<BookRef> {
  const search = async () => {
    const response = await authedGet(request, `/books/search?q=${encodeURIComponent(input.title)}&size=50`, auth);
    if (!response.ok()) throw new Error(`GET /books/search failed: ${response.status()}`);
    return ((await response.json()) as { data: Array<{ id: string; bookName: string }> }).data;
  };

  const existing = (await search()).find((book) => book.bookName === input.title);
  if (existing) return { id: existing.id, title: existing.bookName };

  const created = await authedPost(request, '/books', auth, {
    isbn: input.isbn ?? '',
    bookName: input.title,
    author: input.author,
    publication: 'Playwright Press',
    language: 'English',
    location: 'PW Test Shelf',
    description: `Created by UI test run ${identity('book')}`,
    coverImageUrl: '',
    categoryId: input.categoryId ?? null,
  });
  if (!created.ok()) throw new Error(`Book creation failed for ${input.title}: ${created.status()}`);

  const book = (await search()).find((entry) => entry.bookName === input.title);
  if (!book) throw new Error(`Book ${input.title} is missing after creation`);
  return { id: book.id, title: book.bookName };
}

export async function addBookCopies(
  request: APIRequestContext,
  auth: AuthContext,
  book: BookRef,
  branch: BranchRef,
  quantity = 1,
): Promise<CopyRef[]> {
  const created = await authedPost(request, `/books/${book.id}/copies`, auth, {
    branchId: branch.id,
    quantity,
    barcodes: [],
  });
  if (!created.ok()) throw new Error(`Adding copies to ${book.id} failed: ${created.status()}`);

  const listed = await authedGet(request, `/books/${book.id}/copies`, auth);
  if (!listed.ok()) throw new Error(`GET /books/${book.id}/copies failed: ${listed.status()}`);
  return ((await listed.json()) as { data: CopyRef[] }).data;
}

export async function ensureStaffUser(
  request: APIRequestContext,
  admin: AuthContext,
  suffix: string,
  role: 'LIBRARIAN' | 'ADMIN',
): Promise<AuthContext> {
  const username = identity(suffix);
  try {
    return await apiLogin(request, username, RUN_PASSWORD);
  } catch {
    const created = await authedPost(request, '/users', admin, {
      firstName: 'PW',
      lastName: suffix,
      phoneNumber: runScopedPhoneNumber(suffix),
      emailId: username,
      role,
      password: RUN_PASSWORD,
    });
    if (!created.ok()) throw new Error(`User creation failed for ${username}: ${created.status()}`);
    return apiLogin(request, username, RUN_PASSWORD);
  }
}

// Re-export Playwright's expect so downstream fixtures can import from this
// single entry-point instead of depending on @playwright/test directly.
export { expect } from '@playwright/test';

export const test = appTest.extend<
  object,
  {
    api: APIRequestContext;
    admin: AuthContext;
    runBranch: BranchRef;
    member: AuthContext;
    librarian: AuthContext;
    catalogCategory: CategoryRef;
    catalogBook: BookRef;
    catalogCopies: CopyRef[];
  }
>({
  api: [
    async ({}, use) => {
      const url = allowedBaseUrl(process.env.BASE_URL);
      const context = await playwrightRequest.newContext({ baseURL: url.origin });
      await use(context);
      await context.dispose();
    },
    { scope: 'worker' },
  ],
  admin: [
    async ({ api }, use) => {
      await use(await getAdmin(api));
    },
    { scope: 'worker' },
  ],
  runBranch: [
    async ({ api, admin }, use) => {
      await use(await ensureBranch(api, admin));
    },
    { scope: 'worker' },
  ],
  member: [
    async ({ api }, use) => {
      await use(await ensureUser(api, identity('member'), RUN_PASSWORD, 'PW', 'Member'));
    },
    { scope: 'worker' },
  ],
  librarian: [
    async ({ api, admin }, use) => {
      await use(await ensureStaffUser(api, admin, 'librarian', 'LIBRARIAN'));
    },
    { scope: 'worker' },
  ],
  catalogCategory: [
    async ({ api, admin }, use) => {
      await use(await ensureCategory(api, admin, `PW ${identity('category')}`));
    },
    { scope: 'worker' },
  ],
  catalogBook: [
    async ({ api, admin, catalogCategory }, use) => {
      await use(
        await ensureBook(api, admin, {
          title: `PW ${identity('book')}`,
          author: 'Playwright Author',
          isbn: runScopedIsbn('book-isbn'),
          categoryId: catalogCategory.id,
        }),
      );
    },
    { scope: 'worker' },
  ],
  catalogCopies: [
    async ({ api, admin, catalogBook, runBranch }, use) => {
      await use(await addBookCopies(api, admin, catalogBook, runBranch, 2));
    },
    { scope: 'worker' },
  ],
});
