import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DevicesPage extends BasePage {
  readonly deviceList: Locator;
  readonly deviceCards: Locator;
  readonly filterDropdown: Locator;
  readonly platformFilter: Locator;
  readonly statusFilter: Locator;
  readonly reserveButton: Locator;
  readonly releaseButton: Locator;
  readonly deviceDetails: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    super(page);
    this.deviceList = page.locator('[class*="device"]');
    this.deviceCards = page.locator('[class*="card"], [class*="device"]');
    this.filterDropdown = page.locator('[class*="filter"], select');
    this.platformFilter = page.locator('button:has-text("Platform"), [class*="platform"]');
    this.statusFilter = page.locator('button:has-text("Status"), [class*="status"]');
    this.reserveButton = page.locator('button:has-text("Reserve"), button:has-text("Book")');
    this.releaseButton = page.locator('button:has-text("Release"), button:has-text("Return")');
    this.deviceDetails = page.locator('[class*="details"], [class*="info"]');
    this.refreshButton = page.locator('button:has-text("Refresh")');
  }

  async navigate() {
    await this.goto('/dashboard/devices');
    await this.waitForPageLoad();
  }

  async filterByPlatform(platform: 'all' | 'android' | 'ios' | 'web') {
    if (platform !== 'all') {
      const platformButton = this.page.locator(`button:has-text("${platform.charAt(0).toUpperCase() + platform.slice(1)}")`);
      await platformButton.click();
    }
    await this.page.waitForTimeout(500);
  }

  async filterByStatus(status: 'all' | 'available' | 'reserved' | 'in-use') {
    const statusButton = this.page.locator(`button:has-text("${status.charAt(0).toUpperCase() + status.slice(1)}")`);
    await statusButton.click();
    await this.page.waitForTimeout(500);
  }

  async reserveDevice(deviceName?: string) {
    if (deviceName) {
      const deviceCard = this.page.locator(`text=${deviceName}`);
      await deviceCard.locator('..').locator(this.reserveButton).click();
    } else {
      await this.reserveButton.first().click();
    }
    await this.page.waitForTimeout(1000);
  }

  async releaseDevice(deviceName: string) {
    const deviceCard = this.page.locator(`text=${deviceName}`);
    await deviceCard.locator('..').locator(this.releaseButton).click();
    await this.page.waitForTimeout(1000);
  }

  async getDeviceCount(): Promise<number> {
    return await this.deviceCards.count();
  }

  async getAvailableDeviceCount(): Promise<number> {
    const availableCards = this.page.locator('[class*="available"], [class*="green"]');
    return await availableCards.count();
  }
}
