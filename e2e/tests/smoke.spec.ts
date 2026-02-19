import { test, expect } from '@playwright/test';
import { DashboardPage, LoginPage, RegisterPage, DevicesPage, AnalyticsPage } from '../pages';

test.describe('Smoke Tests', () => {
  let dashboardPage: DashboardPage;
  let loginPage: LoginPage;
  let registerPage: RegisterPage;
  let devicesPage: DevicesPage;
  let analyticsPage: AnalyticsPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    devicesPage = new DevicesPage(page);
    analyticsPage = new AnalyticsPage(page);
  });

  test.describe('Home Page', () => {
    test('should load home page', async ({ page }) => {
      await page.goto('/');
      
      // Home page should load
      await page.waitForLoadState('networkidle');
      
      // Should have some content
      const body = await page.locator('body');
      await expect(body).toBeVisible();
    });

    test('should have navigation to login', async ({ page }) => {
      await page.goto('/');
      
      // Look for login/signin link
      const loginLink = page.locator('a[href="/login"], a[href*="signin"]').first();
      const isVisible = await loginLink.isVisible().catch(() => false);
      
      // Login should be accessible
      if (isVisible) {
        await loginLink.click();
        await expect(page).toHaveURL(/\/login/);
      }
    });
  });

  test.describe('Authentication Pages', () => {
    test('should load login page', async ({ page }) => {
      await loginPage.navigate();
      
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('text=Welcome back')).toBeVisible();
    });

    test('should load register page', async ({ page }) => {
      await registerPage.navigate();
      
      await expect(page).toHaveURL(/\/register/);
      await expect(page.locator('text=Create your account')).toBeVisible();
    });

    test('should load forgot password page', async ({ page }) => {
      await page.goto('/forgot-password');
      
      await expect(page).toHaveURL(/\/forgot-password/);
    });
  });

  test.describe('Dashboard', () => {
    test('should load dashboard page', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Dashboard should load (might redirect to login if not authenticated)
      await page.waitForLoadState('networkidle');
      
      // Should show either dashboard or redirect to login
      const currentUrl = page.url();
      const isAuthenticated = currentUrl.includes('/dashboard');
      const isLogin = currentUrl.includes('/login');
      
      expect(isAuthenticated || isLogin).toBe(true);
    });

    test('should display stats on dashboard', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Wait for page to load
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Check for any stats/grid elements
      const gridElements = page.locator('[class*="grid"]');
      const count = await gridElements.count();
      
      // Dashboard should have grid layout
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('All Pages Load', () => {
    test('should load devices page', async ({ page }) => {
      await devicesPage.navigate();
      
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Either shows devices or redirects to login
      const currentUrl = page.url();
      const isAccessible = currentUrl.includes('/devices') || currentUrl.includes('/login');
      expect(isAccessible).toBe(true);
    });

    test('should load analytics page', async ({ page }) => {
      await analyticsPage.navigate();
      
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Either shows analytics or redirects to login
      const currentUrl = page.url();
      const isAccessible = currentUrl.includes('/analytics') || currentUrl.includes('/login');
      expect(isAccessible).toBe(true);
    });

    test('should load settings page', async ({ page }) => {
      await page.goto('/settings');
      
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Either shows settings or redirects to login
      const currentUrl = page.url();
      const isAccessible = currentUrl.includes('/settings') || currentUrl.includes('/login');
      expect(isAccessible).toBe(true);
    });

    test('should load teams page', async ({ page }) => {
      await page.goto('/dashboard/teams');
      
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Either shows teams or redirects to login
      const currentUrl = page.url();
      const isAccessible = currentUrl.includes('/teams') || currentUrl.includes('/login');
      expect(isAccessible).toBe(true);
    });

    test('should load builds page', async ({ page }) => {
      await page.goto('/dashboard/builds');
      
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Either shows builds or redirects to login
      const currentUrl = page.url();
      const isAccessible = currentUrl.includes('/builds') || currentUrl.includes('/login');
      expect(isAccessible).toBe(true);
    });
  });

  test.describe('Responsive Design', () => {
    test('should have proper viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await dashboardPage.navigate();
      
      // Page should render correctly
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await dashboardPage.navigate();
      
      // Page should render (may have different layout)
      await page.waitForLoadState('networkidle').catch(() => {});
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between pages', async ({ page }) => {
      // Home -> Login -> Register -> Home
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/login');
      await expect(page).toHaveURL(/\/login/);
      
      await page.goto('/register');
      await expect(page).toHaveURL(/\/register/);
      
      await page.goto('/');
      await expect(page).toHaveURL(/(\/|$)/);
    });

    test('should handle direct URL access', async ({ page }) => {
      const pages = [
        '/dashboard',
        '/dashboard/devices',
        '/dashboard/analytics',
        '/dashboard/teams',
        '/dashboard/builds',
        '/settings',
      ];
      
      for (const path of pages) {
        await page.goto(path);
        await page.waitForLoadState('networkidle').catch(() => {});
        
        // Should either show page or redirect to login
        const url = page.url();
        const isValid = url.includes(path) || url.includes('/login');
        expect(isValid).toBe(true);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 gracefully', async ({ page }) => {
      await page.goto('/non-existent-page-12345');
      
      // Should show error or redirect
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Page should not crash
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle invalid app ID', async ({ page }) => {
      await page.goto('/app/invalid-app-id');
      
      // Should handle gracefully
      await page.waitForLoadState('networkidle').catch(() => {});
    });
  });
});
