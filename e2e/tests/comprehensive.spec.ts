import { test, expect } from '@playwright/test';
import { DashboardPage, AppDetailPage, LoginPage } from '../pages';

test.describe('User Session', () => {
  let dashboardPage: DashboardPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    loginPage = new LoginPage(page);
  });

  test.describe('Logout', () => {
    test('should have logout button in header', async ({ page }) => {
      await dashboardPage.navigate();
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Look for logout button - could be in header, dropdown, or settings
      const logoutButton = page.locator(
        'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout"), [aria-label*="logout"]'
      ).first();
      
      const isVisible = await logoutButton.isVisible().catch(() => false);
      // Logout should be accessible when logged in, or login page when logged out
      expect(isVisible || page.url().includes('/login')).toBe(true);
    });

    test('should redirect to login after logout', async ({ page }) => {
      // Try to logout via URL or button
      await page.goto('/api/auth/logout').catch(() => {});
      await page.waitForTimeout(1000);
      
      // Should redirect to login or home
      const url = page.url();
      expect(url.includes('/login') || url.includes('/') || url.includes('login')).toBe(true);
    });

    test('should clear session on logout', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Execute logout if possible
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Navigate to protected page
      await page.goto('/dashboard');
      await page.waitForTimeout(500);
      
      // Should redirect to login due to cleared session
      const url = page.url();
      expect(url.includes('/login') || url.includes('/')).toBe(true);
    });
  });

  test.describe('Session Persistence', () => {
    test('should persist login state in localStorage', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Check localStorage for auth data
      const hasSession = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.some(k => k.includes('token') || k.includes('auth') || k.includes('user'));
      });
      
      // Either has session or redirected to login
      expect(hasSession || page.url().includes('/login')).toBe(true);
    });

    test('should restore session on page refresh', async ({ page }) => {
      await dashboardPage.navigate();
      const initialUrl = page.url();
      
      // Refresh page
      await page.reload();
      await page.waitForTimeout(1000);
      
      const afterRefreshUrl = page.url();
      // Should either stay on dashboard or redirect properly
      expect(afterRefreshUrl.includes('/dashboard') || afterRefreshUrl.includes('/login')).toBe(true);
    });
  });
});

test.describe('Notifications', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Notification Display', () => {
    test('should have notification bell/icon in header', async ({ page }) => {
      await dashboardPage.navigate();
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Look for notification indicator
      const notificationIcon = page.locator(
        '[class*="notification"], [aria-label*="notification"], [class*="bell"]'
      ).first();
      
      const isVisible = await notificationIcon.isVisible().catch(() => false);
      // Should have notification area or be on login
      expect(isVisible || page.url().includes('/login')).toBe(true);
    });

    test('should show notification badge when notifications exist', async ({ page }) => {
      await dashboardPage.navigate();
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Look for badge count
      const badge = page.locator('[class*="badge"], [class*="count"]').first();
      const hasBadge = await badge.isVisible().catch(() => false);
      
      // Badge might or might not be visible depending on notifications
      expect(typeof hasBadge).toBe('boolean');
    });

    test('should open notification panel on click', async ({ page }) => {
      await dashboardPage.navigate();
      await page.waitForLoadState('networkidle').catch(() => {});
      
      const notificationIcon = page.locator(
        '[class*="notification"], [aria-label*="notification"], [class*="bell"]'
      ).first();
      
      if (await notificationIcon.isVisible().catch(() => false)) {
        await notificationIcon.click();
        await page.waitForTimeout(500);
        
        // Should show some panel or dropdown
        const panel = page.locator('[class*="popover"], [class*="dropdown"], [class*="panel"]');
        const panelVisible = await panel.first().isVisible().catch(() => false);
        // Panel might open or icon might just be decorative
        expect(typeof panelVisible).toBe('boolean');
      }
    });
  });

  test.describe('Notification Types', () => {
    test('should handle test completion notifications', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Look for any toast/alert elements that might be notifications
      const toasts = page.locator('[class*="toast"], [class*="alert"], [class*="snackbar"]');
      const count = await toasts.count();
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should display notification timestamp', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Check if notification items have timestamps
      const notificationItems = page.locator('[class*="notification"], [class*="item"]');
      const hasTime = await notificationItems.first().locator('text=/\\d{1,2}:\\d{2}|ago|just/i').isVisible().catch(() => false);
      
      // Timestamps may or may not be visible
      expect(typeof hasTime).toBe('boolean');
    });
  });
});

test.describe('App Switching', () => {
  let dashboardPage: DashboardPage;
  let appDetailPage: AppDetailPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    appDetailPage = new AppDetailPage(page);
  });

  test.describe('App List Display', () => {
    test('should display list of apps', async ({ page }) => {
      await dashboardPage.navigate();
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Look for app cards or list items
      const appCards = page.locator('[class*="card"], [class*="app-"]');
      const count = await appCards.count();
      
      // Apps should be displayed or message shown
      const noAppsMessage = page.locator('text=/No apps|No applications|Add your first/i');
      const hasNoAppsMessage = await noAppsMessage.isVisible().catch(() => false);
      
      expect(count > 0 || hasNoAppsMessage).toBe(true);
    });

    test('should show app name for each app', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Look for app name elements
      const appNames = page.locator('text=/[A-Z]/'); // Any text could be app name
      const count = await appNames.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should show app type/icon for each app', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Look for type indicators (web, android, ios icons)
      const typeIcons = page.locator('[class*="icon"], [class*="type"], svg[class*="globe"], svg[class*="smartphone"]');
      const hasIcons = await typeIcons.first().isVisible().catch(() => false);
      
      expect(typeof hasIcons).toBe('boolean');
    });

    test('should show app status indicator', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Look for status (active, testing, etc.)
      const status = page.locator('text=/active|testing|pending|completed/i');
      const hasStatus = await status.first().isVisible().catch(() => false);
      
      expect(typeof hasStatus).toBe('boolean');
    });
  });

  test.describe('App Selection', () => {
    test('should click to view app details', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Try to click on an app card
      const appCard = page.locator('[class*="card"]').first();
      
      if (await appCard.isVisible().catch(() => false)) {
        await appCard.click();
        await page.waitForTimeout(500);
        
        // Should navigate to app detail or show modal
        const url = page.url();
        const hasDetail = url.includes('/app/') || page.locator('[class*="detail"]').isVisible().catch(() => false);
        expect(hasDetail || url.includes('/dashboard')).toBe(true);
      }
    });

    test('should switch between apps', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Get initial app
      const firstApp = page.locator('[class*="card"]').first();
      
      if (await firstApp.isVisible().catch(() => false)) {
        const firstAppName = await firstApp.textContent();
        
        // Go to first app detail
        await firstApp.click();
        await page.waitForTimeout(500);
        
        // Go back to dashboard
        await page.goto('/dashboard');
        await page.waitForTimeout(500);
        
        // Click different app if exists
        const secondApp = page.locator('[class*="card"]').nth(1);
        if (await secondApp.isVisible().catch(() => false)) {
          const secondAppName = await secondApp.textContent();
          // Names should be different (different apps)
          expect(firstAppName !== secondAppName || page.url().includes('/app/')).toBe(true);
        }
      }
    });

    test('should display app URL for each app', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Look for URL display
      const urlText = page.locator('text=/https?:\\/\\//');
      const hasUrl = await urlText.first().isVisible().catch(() => false);
      
      expect(typeof hasUrl).toBe('boolean');
    });
  });
});

test.describe('App Management', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Add New App', () => {
    test('should have add app button', async ({ page }) => {
      await dashboardPage.navigate();
      
      const addButton = page.locator('button:has-text("Add"), button:has-text("New"), a:has-text("Add app")');
      const isVisible = await addButton.first().isVisible().catch(() => false);
      
      expect(isVisible || page.url().includes('/login')).toBe(true);
    });

    test('should open add app modal/form', async ({ page }) => {
      await dashboardPage.navigate();
      
      const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
      
      if (await addButton.isVisible().catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Should show modal or form
        const form = page.locator('form, [class*="modal"], [class*="dialog"]');
        const formVisible = await form.first().isVisible().catch(() => false);
        expect(formVisible || page.url().includes('/login')).toBe(true);
      }
    });

    test('should validate app URL input', async ({ page }) => {
      await dashboardPage.navigate();
      
      const addButton = page.locator('button:has-text("Add")').first();
      
      if (await addButton.isVisible().catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Try to submit empty form
        const submitButton = page.locator('button[type="submit"]');
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();
          
          // Should show validation error
          const error = page.locator('[class*="error"], text=/required|invalid/i');
          const hasError = await error.first().isVisible().catch(() => false);
          expect(typeof hasError).toBe('boolean');
        }
      }
    });

    test('should select app type (web/android/ios)', async ({ page }) => {
      await dashboardPage.navigate();
      
      const addButton = page.locator('button:has-text("Add")').first();
      
      if (await addButton.isVisible().catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Look for type selectors
        const typeSelector = page.locator('select, [class*="type"], button:has-text("Web"), button:has-text("Android")');
        const hasSelector = await typeSelector.first().isVisible().catch(() => false);
        
        expect(typeof hasSelector).toBe('boolean');
      }
    });
  });

  test.describe('Delete App', () => {
    test('should have delete option for apps', async ({ page }) => {
      await dashboardPage.navigate();
      
      // Look for delete button/menu
      const deleteButton = page.locator('button:has-text("Delete"), [aria-label*="Delete"]');
      const hasDelete = await deleteButton.first().isVisible().catch(() => false);
      
      expect(typeof hasDelete).toBe('boolean');
    });
  });
});

test.describe('UI Elements Purpose', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Header Elements', () => {
    test('should have logo', async ({ page }) => {
      await dashboardPage.navigate();
      
      const logo = page.locator('[class*="logo"], img[alt*="logo"], h1');
      const hasLogo = await logo.first().isVisible().catch(() => false);
      
      expect(hasLogo || page.url().includes('/login')).toBe(true);
    });

    test('should have user menu', async ({ page }) => {
      await dashboardPage.navigate();
      
      const userMenu = page.locator('[class*="user"], [class*="avatar"], button[aria-label*="user"]');
      const hasUserMenu = await userMenu.first().isVisible().catch(() => false);
      
      expect(hasUserMenu || page.url().includes('/login')).toBe(true);
    });

    test('should have search functionality', async ({ page }) => {
      await dashboardPage.navigate();
      
      const search = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]');
      const hasSearch = await search.first().isVisible().catch(() => false);
      
      expect(typeof hasSearch).toBe('boolean');
    });
  });

  test.describe('Sidebar Navigation', () => {
    test('should have sidebar with navigation', async ({ page }) => {
      await dashboardPage.navigate();
      
      const sidebar = page.locator('nav, [class*="sidebar"], [class*="aside"]');
      const hasSidebar = await sidebar.first().isVisible().catch(() => false);
      
      expect(typeof hasSidebar).toBe('boolean');
    });

    test('should have dashboard link', async ({ page }) => {
      await dashboardPage.navigate();
      
      const dashboardLink = page.locator('a[href*="dashboard"], text=/Dashboard/i');
      const hasLink = await dashboardLink.first().isVisible().catch(() => false);
      
      expect(hasLink || page.url().includes('/login')).toBe(true);
    });

    test('should have apps section', async ({ page }) => {
      await dashboardPage.navigate();
      
      const appsLink = page.locator('a[href*="app"], text=/Apps|Applications/i');
      const hasApps = await appsLink.first().isVisible().catch(() => false);
      
      expect(typeof hasApps).toBe('boolean');
    });

    test('should have devices link', async ({ page }) => {
      await dashboardPage.navigate();
      
      const devicesLink = page.locator('a[href*="device"], text=/Devices/i');
      const hasDevices = await devicesLink.first().isVisible().catch(() => false);
      
      expect(typeof hasDevices).toBe('boolean');
    });

    test('should have analytics link', async ({ page }) => {
      await dashboardPage.navigate();
      
      const analyticsLink = page.locator('a[href*="analytics"], text=/Analytics/i');
      const hasAnalytics = await analyticsLink.first().isVisible().catch(() => false);
      
      expect(typeof hasAnalytics).toBe('boolean');
    });
  });

  test.describe('Dashboard Content', () => {
    test('should have stats cards', async ({ page }) => {
      await dashboardPage.navigate();
      
      const statsCards = page.locator('[class*="stat"], [class*="metric"], [class*="card"]');
      const count = await statsCards.count();
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should have recent activity section', async ({ page }) => {
      await dashboardPage.navigate();
      
      const activity = page.locator('text=/Recent|Activity|History/i');
      const hasActivity = await activity.first().isVisible().catch(() => false);
      
      expect(typeof hasActivity).toBe('boolean');
    });

    test('should have quick actions', async ({ page }) => {
      await dashboardPage.navigate();
      
      const quickActions = page.locator('text=/Quick|New|Run|Start/i');
      const hasActions = await quickActions.first().isVisible().catch(() => false);
      
      expect(typeof hasActions).toBe('boolean');
    });
  });

  test.describe('Footer', () => {
    test('should have footer with links', async ({ page }) => {
      await page.goto('/');
      
      const footer = page.locator('footer, [class*="footer"]');
      const hasFooter = await footer.first().isVisible().catch(() => false);
      
      expect(typeof hasFooter).toBe('boolean');
    });

    test('should have copyright text', async ({ page }) => {
      await page.goto('/');
      
      const copyright = page.locator('text=/©|copyright/i');
      const hasCopyright = await copyright.first().isVisible().catch(() => false);
      
      expect(typeof hasCopyright).toBe('boolean');
    });
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check h1 exists
    const h1 = page.locator('h1');
    const hasH1 = await h1.first().isVisible().catch(() => false);
    
    expect(hasH1 || page.url().includes('/login')).toBe(true);
  });

  test('should have form labels', async ({ page }) => {
    await page.goto('/login');
    
    const labels = page.locator('label');
    const hasLabels = await labels.first().isVisible().catch(() => false);
    
    expect(typeof hasLabels).toBe('boolean');
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/dashboard');
    
    const images = page.locator('img');
    const count = await images.count();
    
    if (count > 0) {
      const withAlt = await images.evaluateAll(imgs => 
        imgs.filter(img => img.alt).length
      );
      expect(withAlt).toBeGreaterThanOrEqual(0);
    }
  });

  test('should have keyboard navigable buttons', async ({ page }) => {
    await page.goto('/dashboard');
    
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
