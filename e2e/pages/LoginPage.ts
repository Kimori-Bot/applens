import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: import('@playwright/test').Locator;
  readonly passwordInput: import('@playwright/test').Locator;
  readonly submitButton: import('@playwright/test').Locator;
  readonly errorMessage: import('@playwright/test').Locator;
  readonly forgotPasswordLink: import('@playwright/test').Locator;
  readonly signUpLink: import('@playwright/test').Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[class*="alert"], [class*="error"], text=Invalid]');
    this.forgotPasswordLink = page.locator('a[href="/forgot-password"]');
    this.signUpLink = page.locator('a[href="/register"]');
  }

  async navigate() {
    await this.goto('/login');
    await this.waitForPageLoad();
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.waitForPageLoad();
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  async isLoginSuccessful(): Promise<boolean> {
    // Wait for navigation to dashboard
    await this.page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
    return this.page.url().includes('/dashboard');
  }
}
