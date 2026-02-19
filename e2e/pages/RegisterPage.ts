import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class RegisterPage extends BasePage {
  readonly nameInput: import('@playwright/test').Locator;
  readonly emailInput: import('@playwright/test').Locator;
  readonly passwordInput: import('@playwright/test').Locator;
  readonly confirmPasswordInput: import('@playwright/test').Locator;
  readonly submitButton: import('@playwright/test').Locator;
  readonly errorMessage: import('@playwright/test').Locator;
  readonly signInLink: import('@playwright/test').Locator;
  readonly passwordStrengthBar: import('@playwright/test').Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.locator('#name');
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.confirmPasswordInput = page.locator('#confirmPassword');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[class*="bg-red-50"], [class*="text-red-700"]');
    this.signInLink = page.locator('a[href="/login"]');
    this.passwordStrengthBar = page.locator('[class*="strength"]');
  }

  async navigate() {
    await this.goto('/register');
    await this.waitForPageLoad();
  }

  async register(name: string, email: string, password: string, confirmPassword?: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword || password);
    await this.submitButton.click();
    await this.waitForPageLoad();
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  async isRegistrationSuccessful(): Promise<boolean> {
    await this.page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
    return this.page.url().includes('/dashboard');
  }
}
