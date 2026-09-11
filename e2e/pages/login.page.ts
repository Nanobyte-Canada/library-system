import { expect, type Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  username() {
    return this.page.getByLabel('Username');
  }

  password() {
    return this.page.getByLabel('Password');
  }

  submit() {
    return this.page.getByRole('button', { name: 'Sign In' });
  }

  pendingSubmit() {
    return this.page.getByRole('button', { name: 'Signing in...' });
  }

  error() {
    return this.page.getByText(
      /Invalid username or password|Login failed\. Please check your credentials\./,
    );
  }

  async login(username: string, password: string): Promise<void> {
    await this.username().fill(username);
    await this.password().fill(password);
    await this.submit().click();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.submit()).toBeVisible();
  }
}
