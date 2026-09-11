import type { Page } from '@playwright/test';

export class AppShellPage {
  constructor(private readonly page: Page) {}

  logoutButton() {
    return this.page.getByRole('button', { name: 'Log out' });
  }

  sidebarLink(name: string) {
    return this.page.locator('.sidebar').getByRole('link', { name });
  }

  async logout(): Promise<void> {
    await this.logoutButton().click();
  }
}
