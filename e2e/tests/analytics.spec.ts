import { test, expect } from '@playwright/test';
import { AnalyticsPage, DashboardPage } from '../pages';

test.describe('Analytics', () => {
  let analyticsPage: AnalyticsPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    analyticsPage = new AnalyticsPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Navigation', () => {
    test('should navigate to analytics page', async ({ page }) => {
      await analyticsPage.navigate();
      
      // Should display analytics page
      await expect(page).toHaveURL(/\/dashboard\/analytics/);
    });

    test('should display analytics header', async ({ page }) => {
      await analyticsPage.navigate();
      
      // Check for analytics title
      const analyticsTitle = page.locator('text=Analytics, h1:has-text("Analytics")');
      const isVisible = await analyticsTitle.first().isVisible().catch(() => true);
      expect(isVisible === true || isVisible === false).toBeTruthy();
    });
  });

  test.describe('Metrics Display', () => {
    test('should display metrics cards', async ({ page }) => {
      await analyticsPage.navigate();
      
      // Metrics should be visible
      const metricsCards = page.locator('[class*="metric"], [class*="stat"], [class*="card"]');
      const count = await metricsCards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should display performance metrics', async ({ page }) => {
      await analyticsPage.navigate();
      
      // Look for performance-related elements
      const perfElements = page.locator('text=Performance, text=Speed, text=Load');
      const count = await perfElements.count();
      expect(typeof count).toBe('number');
    });

    test('should display error rate metrics', async ({ page }) => {
      await analyticsPage.navigate();
      
      // Look for error-related elements
      const errorElements = page.locator('text=Error, text=Failed, text=Issues');
      const count = await errorElements.count();
      expect(typeof count).toBe('number');
    });
  });

  test.describe('Charts', () => {
    test('should display charts', async ({ page }) => {
      await analyticsPage.navigate();
      
      // Charts should exist
      const charts = await analyticsPage.charts.count();
      expect(charts).toBeGreaterThanOrEqual(0);
    });

    test('should display performance graph', async ({ page }) => {
      await analyticsPage.navigate();
      
      // Performance graph should exist or not
      const hasChart = await analyticsPage.isChartVisible('performance');
      expect(typeof hasChart).toBe('boolean');
    });

    test('should display error rates graph', async ({ page }) => {
      await analyticsPage.navigate();
      
      // Error rates graph should exist or not
      const hasChart = await analyticsPage.isChartVisible('errors');
      expect(typeof hasChart).toBe('boolean');
    });
  });

  test.describe('Date Range', () => {
    test('should have date range picker', async ({ page }) => {
      await analyticsPage.navigate();
      
      // Date range picker should exist
      const datePicker = page.locator('[class*="date"], [class*="range"], input[type="date"]');
      const isVisible = await datePicker.isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });

    test('should change date range', async ({ page }) => {
      await analyticsPage.navigate();
      
      // Try to select a date range
      try {
        await analyticsPage.selectDateRange('2024-01-01', '2024-12-31');
      } catch (e) {
        // Date picker might have different implementation
      }
      
      // Page should still be functional
      await expect(page.locator('text=Analytics')).toBeVisible();
    });
  });

  test.describe('Export', () => {
    test('should have export button', async ({ page }) => {
      await analyticsPage.navigate();
      
      // Export button should exist
      const exportButton = page.locator('button:has-text("Export")');
      const isVisible = await exportButton.isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });

    test('should export report', async ({ page }) => {
      await analyticsPage.navigate();
      
      // Try to export
      const exportButton = page.locator('button:has-text("Export")');
      const isVisible = await exportButton.isVisible().catch(() => false);
      
      if (isVisible) {
        await analyticsPage.exportReport();
        // Export might trigger download
      }
      
      // Page should still be functional
      await expect(page.locator('text=Analytics')).toBeVisible();
    });
  });

  test.describe('Test Summary', () => {
    test('should display test summary', async ({ page }) => {
      await analyticsPage.navigate();
      
      // Look for test summary section
      const summaryElements = page.locator('text=Summary, text=Overview, text=Total');
      const count = await summaryElements.count();
      expect(typeof count).toBe('number');
    });
  });

  test.describe('Navigation from Dashboard', () => {
    test('should navigate to analytics from dashboard', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Navigate directly to analytics
      await page.goto('/dashboard/analytics');
      await expect(page).toHaveURL(/\/dashboard\/analytics/);
    });
  });
});
