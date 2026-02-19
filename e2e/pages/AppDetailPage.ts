import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AppDetailPage extends BasePage {
  readonly appTitle: Locator;
  readonly appUrl: Locator;
  readonly runTestButton: Locator;
  readonly testHistory: Locator;
  readonly screenshotsSection: Locator;
  readonly settingsButton: Locator;
  readonly deleteButton: Locator;
  readonly apiToken: Locator;
  readonly copyTokenButton: Locator;

  constructor(page: Page) {
    super(page);
    this.appTitle = page.locator('h1, [class*="title"]').first();
    this.appUrl = page.locator('[class*="url"], [class*="link"]');
    this.runTestButton = page.locator('button:has-text("Run Test"), button:has-text("Start Test")');
    this.testHistory = page.locator('[class*="history"], [class*="tests"], table');
    this.screenshotsSection = page.locator('[class*="screenshot"], [class*="image"]');
    this.settingsButton = page.locator('button:has-text("Settings"), [class*="settings"]');
    this.deleteButton = page.locator('button:has-text("Delete")');
    this.apiToken = page.locator('[class*="token"], code');
    this.copyTokenButton = page.locator('button:has-text("Copy")');
  }

  async navigate(appId: string) {
    await this.goto(`/app/${appId}`);
    await this.waitForPageLoad();
  }

  async runTest() {
    await this.runTestButton.click();
    await this.page.waitForTimeout(2000); // Wait for test to start
  }

  async getApiToken(): Promise<string> {
    return await this.apiToken.textContent() || '';
  }

  async copyApiToken() {
    await this.copyTokenButton.click();
  }

  async deleteApp() {
    await this.deleteButton.click();
    await this.page.on('dialog', dialog => dialog.accept());
    await this.page.waitForURL('/dashboard');
  }

  async isTestRunning(): Promise<boolean> {
    const runningIndicator = this.page.locator('[class*="running"], [class*="progress"]');
    return await runningIndicator.isVisible();
  }

  async getTestResults(): Promise<string[]> {
    const results = await this.testHistory.locator('[class*="status"]').allTextContents();
    return results;
  }
}
