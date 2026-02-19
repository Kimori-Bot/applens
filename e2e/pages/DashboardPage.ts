import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly addAppButton: Locator;
  readonly appCards: Locator;
  readonly appsList: Locator;
  readonly addAppModal: Locator;
  readonly appNameInput: Locator;
  readonly appUrlInput: Locator;
  readonly appPlatformButtons: Locator;
  readonly saveAppButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteAppButton: Locator;
  readonly statsCards: Locator;
  readonly recentActivity: Locator;
  readonly sidebar: Locator;

  constructor(page: Page) {
    super(page);
    this.addAppButton = page.locator('button:has-text("Add App")').first();
    this.appCards = page.locator('[class*="card"], a[href^="/app/"]');
    this.appsList = page.locator('[class*="grid"] a[href^="/app/"]');
    this.addAppModal = page.locator('[class*="modal"], [class*="fixed"]:has-text("Add New App")');
    this.appNameInput = page.locator('input[placeholder*="My App"], input[type="text"]').first();
    this.appUrlInput = page.locator('input[placeholder*="https://"], input[type="text"]').nth(1);
    this.appPlatformButtons = page.locator('button:has-text("Web"), button:has-text("Android"), button:has-text("iOS")');
    this.saveAppButton = page.locator('button:has-text("Add App")').last();
    this.cancelButton = page.locator('button:has-text("Cancel")');
    this.deleteAppButton = page.locator('button:has-text("Delete"), [class*="trash"]');
    this.statsCards = page.locator('[class*="grid"] > div');
    this.recentActivity = page.locator('table, [class*="activity"]');
    this.sidebar = page.locator('[class*="sidebar"], nav');
  }

  async navigate() {
    await this.goto('/dashboard');
    await this.waitForPageLoad();
  }

  async openAddAppModal() {
    await this.addAppButton.click();
    await this.addAppModal.waitFor({ state: 'visible' });
  }

  async createApp(name: string, url: string, platform: 'web' | 'android' | 'ios' = 'web') {
    await this.openAddAppModal();
    
    await this.appNameInput.fill(name);
    await this.appUrlInput.fill(url);
    
    // Select platform
    const platformButton = this.page.locator(`button:has-text("${platform.charAt(0).toUpperCase() + platform.slice(1)}")`);
    await platformButton.click();
    
    await this.saveAppButton.click();
    await this.page.waitForURL(/\/app\/.+/);
  }

  async deleteApp(appName: string) {
    // Hover over the app card to reveal delete button
    const appCard = this.page.locator(`text=${appName}`).locator('..');
    await appCard.hover();
    await this.deleteAppButton.click();
    
    // Confirm deletion
    await this.page.on('dialog', dialog => dialog.accept());
  }

  async getAppCount(): Promise<number> {
    return await this.appsList.count();
  }

  async getStats(): Promise<{ apps: number; tests: number; completed: number; running: number }> {
    const statsText = await this.statsCards.allTextContents();
    return {
      apps: parseInt(statsText[0] || '0'),
      tests: parseInt(statsText[1] || '0'),
      completed: parseInt(statsText[2] || '0'),
      running: parseInt(statsText[3] || '0'),
    };
  }

  async navigateToSection(section: 'apps' | 'devices' | 'builds' | 'analytics' | 'teams' | 'settings') {
    const sectionLinks = {
      apps: '/dashboard',
      devices: '/dashboard/devices',
      builds: '/dashboard/builds',
      analytics: '/dashboard/analytics',
      teams: '/dashboard/teams',
      settings: '/settings',
    };
    
    await this.goto(sectionLinks[section]);
    await this.waitForPageLoad();
  }
}
