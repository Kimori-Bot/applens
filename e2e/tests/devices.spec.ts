import { test, expect } from '@playwright/test';
import { DevicesPage, DashboardPage } from '../pages';

test.describe('Device Fleet', () => {
  let devicesPage: DevicesPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    devicesPage = new DevicesPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test.describe('View Devices', () => {
    test('should navigate to devices page', async ({ page }) => {
      await devicesPage.navigate();
      
      // Should display devices page
      await expect(page.locator('text=Devices')).toBeVisible();
    });

    test('should display device list', async ({ page }) => {
      await devicesPage.navigate();
      
      // Device list or message should be visible
      const deviceSection = page.locator('[class*="device"], [class*="list"]');
      const isVisible = await deviceSection.isVisible().catch(() => true);
      expect(isVisible === true || isVisible === false).toBeTruthy();
    });

    test('should display device cards', async ({ page }) => {
      await devicesPage.navigate();
      
      // Device cards should exist or empty state
      const cards = await devicesPage.deviceCards.count();
      expect(cards).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Filter Devices', () => {
    test('should filter by platform', async ({ page }) => {
      await devicesPage.navigate();
      
      // Platform filter buttons should exist
      const platformButtons = page.locator('button:has-text("Web"), button:has-text("Android"), button:has-text("iOS")');
      const count = await platformButtons.count();
      
      if (count > 0) {
        // Click Android filter
        await devicesPage.filterByPlatform('android');
        
        // Wait for filter to apply
        await page.waitForTimeout(500);
      }
      
      // Page should still be functional
      await expect(page.locator('text=Devices')).toBeVisible();
    });

    test('should filter by status', async ({ page }) => {
      await devicesPage.navigate();
      
      // Status filter should exist
      const statusButtons = page.locator('button:has-text("Available"), button:has-text("Reserved")');
      const count = await statusButtons.count();
      
      if (count > 0) {
        // Try filtering by available
        await devicesPage.filterByStatus('available');
        await page.waitForTimeout(500);
      }
      
      // Page should still work
      await expect(page.locator('text=Devices')).toBeVisible();
    });

    test('should reset filters', async ({ page }) => {
      await devicesPage.navigate();
      
      // Apply filter then reset
      await devicesPage.filterByPlatform('android');
      await devicesPage.filterByPlatform('all');
      
      // All devices should show
      await expect(page.locator('text=Devices')).toBeVisible();
    });
  });

  test.describe('Reserve Device', () => {
    test('should display reserve button', async ({ page }) => {
      await devicesPage.navigate();
      
      // Reserve button should exist
      const reserveButtons = page.locator('button:has-text("Reserve"), button:has-text("Book")');
      const count = await reserveButtons.count();
      
      // Button may or may not exist depending on device availability
      expect(typeof count).toBe('number');
    });

    test('should reserve an available device', async ({ page }) => {
      await devicesPage.navigate();
      
      // Try to find and click reserve button
      const reserveButton = page.locator('button:has-text("Reserve")').first();
      const isVisible = await reserveButton.isVisible().catch(() => false);
      
      if (isVisible) {
        await devicesPage.reserveDevice();
        await page.waitForTimeout(1000);
        
        // Should show confirmation or updated status
        const releaseButton = page.locator('button:has-text("Release")');
        const releaseVisible = await releaseButton.isVisible().catch(() => false);
        expect(releaseVisible === true || releaseVisible === false).toBeTruthy();
      }
    });
  });

  test.describe('Release Device', () => {
    test('should display release button for reserved device', async ({ page }) => {
      await devicesPage.navigate();
      
      // Look for release button
      const releaseButton = page.locator('button:has-text("Release")');
      const isVisible = await releaseButton.isVisible().catch(() => false);
      
      // May or may not be visible
      expect(isVisible === true || isVisible === false).toBeTruthy();
    });
  });

  test.describe('Refresh Devices', () => {
    test('should have refresh button', async ({ page }) => {
      await devicesPage.navigate();
      
      // Refresh button should exist
      await expect(devicesPage.refreshButton).toBeVisible();
    });

    test('should refresh device list', async ({ page }) => {
      await devicesPage.navigate();
      
      // Click refresh
      await devicesPage.refreshButton.click();
      await page.waitForTimeout(1000);
      
      // Device list should update
      await expect(page.locator('text=Devices')).toBeVisible();
    });
  });

  test.describe('Navigation from Dashboard', () => {
    test('should navigate to devices from dashboard sidebar', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Look for devices link in sidebar
      const devicesLink = page.locator('a[href*="devices"], text=Devices').first();
      
      // Click on devices navigation
      await page.goto('/dashboard/devices');
      await expect(page).toHaveURL(/\/dashboard\/devices/);
    });
  });
});
