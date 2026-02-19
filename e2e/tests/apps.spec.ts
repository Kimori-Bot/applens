import { test, expect } from '@playwright/test';
import { DashboardPage, AppDetailPage } from '../pages';

test.describe('App Management', () => {
  let dashboardPage: DashboardPage;
  let appDetailPage: AppDetailPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    appDetailPage = new AppDetailPage(page);
  });

  test.describe('Dashboard App List', () => {
    test('should display dashboard with apps section', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Check for dashboard header
      await expect(page.locator('h1:has-text("Dashboard")').first()).toBeVisible();
      await expect(page.locator('text=Manage your apps')).toBeVisible();
    });

    test('should display Add App button', async ({ page }) => {
      await dashboardPage.navigate();
      
      await expect(dashboardPage.addAppButton).toBeVisible();
    });

    test('should display stats cards', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Stats should be visible
      const statsCards = page.locator('[class*="grid"] > div');
      const count = await statsCards.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Create App', () => {
    test('should open add app modal', async ({ page }) => {
      await dashboardPage.navigate();
      await dashboardPage.openAddAppModal();
      
      // Modal should be visible
      await expect(page.locator('text=Add New App')).toBeVisible();
      await expect(dashboardPage.appNameInput).toBeVisible();
      await expect(dashboardPage.appUrlInput).toBeVisible();
    });

    test('should create a new web app', async ({ page }) => {
      await dashboardPage.navigate();
      
      const appName = `Test App ${Date.now()}`;
      const appUrl = 'https://example.com';
      
      await dashboardPage.createApp(appName, appUrl, 'web');
      
      // Should navigate to app detail page
      await expect(page).toHaveURL(/\/app\/.+/);
      
      // App name should be visible
      await expect(page.locator(`text=${appName}`)).toBeVisible();
    });

    test('should create an android app', async ({ page }) => {
      await dashboardPage.navigate();
      
      const appName = `Android App ${Date.now()}`;
      const appUrl = 'https://play.google.com/store/apps/test';
      
      await dashboardPage.createApp(appName, appUrl, 'android');
      
      // Should navigate to app detail page
      await expect(page).toHaveURL(/\/app\/.+/);
    });

    test('should create an iOS app', async ({ page }) => {
      await dashboardPage.navigate();
      
      const appName = `iOS App ${Date.now()}`;
      const appUrl = 'https://apps.apple.com/test';
      
      await dashboardPage.createApp(appName, appUrl, 'ios');
      
      // Should navigate to app detail page
      await expect(page).toHaveURL(/\/app\/.+/);
    });

    test('should not create app with empty name', async ({ page }) => {
      await dashboardPage.navigate();
      await dashboardPage.openAddAppModal();
      
      // Fill only URL
      await dashboardPage.appUrlInput.fill('https://example.com');
      await dashboardPage.saveAppButton.click();
      
      // Modal should still be visible (validation error)
      await expect(page.locator('text=Add New App')).toBeVisible();
    });
  });

  test.describe('App Detail', () => {
    test('should display app details correctly', async ({ page }) => {
      // First create an app
      await dashboardPage.navigate();
      const appName = `Detail Test App ${Date.now()}`;
      await dashboardPage.createApp(appName, 'https://example.com', 'web');
      
      // Check app title
      await expect(appDetailPage.appTitle).toBeVisible();
      
      // Check for test controls
      await expect(appDetailPage.runTestButton).toBeVisible();
    });

    test('should display API token', async ({ page }) => {
      await dashboardPage.navigate();
      const appName = `Token Test App ${Date.now()}`;
      await dashboardPage.createApp(appName, 'https://example.com', 'web');
      
      // API token should be visible
      const token = await appDetailPage.getApiToken();
      expect(token).toContain('apl_');
    });
  });

  test.describe('Delete App', () => {
    test('should delete app from dashboard', async ({ page }) => {
      // First create an app
      await dashboardPage.navigate();
      const appName = `Delete Test App ${Date.now()}`;
      await dashboardPage.createApp(appName, 'https://example.com', 'web');
      
      // Go back to dashboard
      await dashboardPage.navigate();
      
      // Find and delete the app
      await dashboardPage.deleteApp(appName);
      
      // App should no longer be visible
      await expect(page.locator(`text=${appName}`)).not.toBeVisible();
    });
  });
});
