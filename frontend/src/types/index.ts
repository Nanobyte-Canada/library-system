export type UserRole = 'ADMIN' | 'LIBRARIAN' | 'MEMBER';
export type MembershipType = 'STUDENT' | 'FACULTY' | 'PUBLIC';
export type CopyStatus = 'AVAILABLE' | 'LOANED' | 'LOST' | 'DAMAGED';
export type ReservationStatus = 'PENDING' | 'READY' | 'EXPIRED' | 'CANCELLED' | 'FULFILLED';

export interface User {
  id: string;
  membershipId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailId: string;
  role: UserRole;
  membershipType: MembershipType;
  branchId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  createdAt: string;
}

export interface Book {
  id: string;
  isbn: string;
  bookName: string;
  author: string;
  publication: string;
  language: string;
  location: string;
  description: string;
  coverImageUrl: string;
  categoryId: string | null;
  categoryName: string | null;
  availableCopies: number;
  totalCopies: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookCopy {
  id: string;
  bookId: string;
  branchId: string;
  branchName?: string;
  barcode: string;
  status: CopyStatus;
  createdAt: string;
}

export interface BookIssue {
  id: string;
  userId: string;
  userName?: string;
  copyId: string;
  bookName?: string;
  barcode?: string;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  renewed: boolean;
}

export interface BookReservation {
  id: string;
  userId: string;
  bookId: string;
  branchId: string;
  status: ReservationStatus;
  queuePosition: number;
  reservedAt: string;
  notifiedAt: string | null;
  expiresAt: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  code: number;
  data: T;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  email: string | null;
}

export interface DashboardStats {
  totalBooks: number;
  totalCopies: number;
  activeLoans: number;
  overdueBooks: number;
  totalUsers: number;
  activeReservations: number;
  totalBranches: number;
}

// --- Book Management Types ---

export interface BookCreateRequest {
  isbn: string;
  bookName: string;
  author: string;
  publication: string;
  language: string;
  location: string;
  description: string;
  coverImageUrl: string;
  categoryId: string | null;
}

export interface BookUpdateRequest {
  isbn?: string;
  bookName?: string;
  author?: string;
  publication?: string;
  language?: string;
  location?: string;
  description?: string;
  coverImageUrl?: string;
  categoryId?: string;
}

export interface BookSearchParams {
  q?: string;
  categoryId?: string;
  language?: string;
  available?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}

export interface BookCopyRequest {
  branchId: string;
  quantity: number;
  barcodes?: string[];
}

export interface BookTransferRequest {
  copyId: string;
  fromBranchId: string;
  toBranchId: string;
}

export interface IsbnLookupResponse {
  isbn: string;
  title: string;
  author: string;
  publication: string;
  language: string;
  coverImageUrl: string;
  description: string;
}

export interface CategoryCreateRequest {
  name: string;
  parentId: string | null;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string | null;
  code: number;
  data: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
