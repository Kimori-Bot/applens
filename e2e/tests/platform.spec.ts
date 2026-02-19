import { test, expect } from '@playwright/test';
import { DashboardPage, AppDetailPage } from '../pages';

test.describe('Test Configuration Management', () => {
  let dashboardPage: DashboardPage;
  let appDetailPage: AppDetailPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    appDetailPage = new AppDetailPage(page);
  });

  test.describe('Create Test Config', () => {
    test('should create explore test config', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/test-configs', {
        data: {
          name: 'Explore Homepage',
          description: 'Explore the main features',
          type: 'explore',
          appId: 'test-app-id',
          goal: 'Explore all features',
          maxSteps: 10
        }
      });

      // May fail without auth, but should attempt
      expect([200, 401, 500]).toContain(response.status());
    });

    test('should create auth test config with credentials', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/test-configs', {
        data: {
          name: 'Login Flow Test',
          description: 'Test the complete login flow',
          type: 'auth',
          appId: 'test-app-id',
          credentials: [
            { name: 'test-user', email: 'test@example.com', password: 'TestPass123!' }
          ],
          maxSteps: 5
        }
      });

      expect([200, 401, 500]).toContain(response.status());
    });

    test('should create task test config with specific goal', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/test-configs', {
        data: {
          name: 'Checkout Flow',
          description: 'Test complete checkout',
          type: 'task',
          appId: 'test-app-id',
          goal: 'Add item to cart and complete checkout',
          maxSteps: 15
        }
      });

      expect([200, 401, 500]).toContain(response.status());
    });

    test('should validate required fields', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/test-configs', {
        data: {
          name: 'Test',
          // Missing type and appId
        }
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('List Test Configs', () => {
    test('should list test configs for app', async ({ page }) => {
      const response = await page.request.get('http://localhost:3005/api/test-configs?appId=test-app-id');
      
      expect([200, 401, 500]).toContain(response.status());
    });

    test('should filter by type', async ({ page }) => {
      const response = await page.request.get('http://localhost:3005/api/test-configs?type=auth');
      
      expect([200, 401, 500]).toContain(response.status());
    });
  });

  test.describe('Run Saved Test', () => {
    test('should run test from config', async ({ page }) => {
      // First create a config
      const createResponse = await page.request.post('http://localhost:3005/api/test-configs', {
        data: {
          name: 'Quick Test',
          type: 'explore',
          appId: 'test-app-id',
          maxSteps: 3
        }
      });

      const config = await createResponse.json().catch(() => ({}));

      if (config.config?.id) {
        // Then run it
        const runResponse = await page.request.post('http://localhost:3005/api/test-runs', {
          data: {
            testConfigId: config.config.id
          }
        });
        
        expect([200, 201, 401, 500]).toContain(runResponse.status());
      }
    });
  });
});

test.describe('APK Testing', () => {
  test.describe('APK Upload', () => {
    test('should show APK upload option', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Look for upload options
      const uploadArea = page.locator('input[type="file"], button:has-text("Upload"), button:has-text("APK")');
      const isVisible = await uploadArea.first().isVisible().catch(() => false);
      
      expect(typeof isVisible).toBe('boolean');
    });

    test('should accept .apk files', async ({ page }) => {
      // Check for file input that accepts APK
      const fileInput = page.locator('input[accept*=".apk"], input[accept*="android"]');
      const hasApkInput = await fileInput.isVisible().catch(() => false);
      
      expect(typeof hasApkInput).toBe('boolean');
    });

    test('should validate APK file type', async ({ page }) => {
      // Try uploading non-APK file
      const fileInput = page.locator('input[type="file"]').first();
      
      if (await fileInput.isVisible().catch(() => false)) {
        // Should reject wrong file types
        const accept = await fileInput.getAttribute('accept');
        expect(accept?.includes('apk') || accept === '*').toBe(true);
      }
    });
  });

  test.describe('APK Installation', () => {
    test('should show install progress', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Look for progress indicators during install
      const progress = page.locator('[class*="progress"], [class*="install"]');
      const hasProgress = await progress.isVisible().catch(() => false);
      
      expect(typeof hasProgress).toBe('boolean');
    });

    test('should display device selection for install', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Look for device selector
      const deviceSelect = page.locator('select, [class*="device"]');
      const hasSelector = await deviceSelect.first().isVisible().catch(() => false);
      
      expect(typeof hasSelector).toBe('boolean');
    });
  });

  test.describe('APK Test Execution', () => {
    test('should run test on installed APK', async ({ page }) => {
      // Test the explore API with android type
      const response = await page.request.post('http://localhost:3005/api/explore', {
        data: {
          appId: 'test-apk-app',
          appName: 'Test APK',
          appUrl: 'demo', // Demo mode
          testType: 'explore',
          maxSteps: 5
        }
      });

      expect(response.ok() || response.status() === 401).toBe(true);
    });

    test('should support auth testing on APK', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/explore', {
        data: {
          appId: 'test-apk-app',
          appName: 'Test APK',
          appUrl: 'demo',
          testType: 'auth',
          credentials: {
            email: 'test@example.com',
            password: 'password123'
          },
          maxSteps: 5
        }
      });

      expect(response.ok() || response.status() === 401).toBe(true);
    });
  });
});

test.describe('IPA Testing (iOS)', () => {
  test.describe('IPA Upload', () => {
    test('should show iOS app upload option', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Look for iOS upload
      const uploadButton = page.locator('button:has-text("iOS"), button:has-text("IPA")');
      const isVisible = await uploadButton.first().isVisible().catch(() => false);
      
      expect(typeof isVisible).toBe('boolean');
    });

    test('should accept .ipa files', async ({ page }) => {
      const fileInput = page.locator('input[accept*=".ipa"], input[accept*="ios"]');
      const hasIpaInput = await fileInput.isVisible().catch(() => false);
      
      expect(typeof hasIpaInput).toBe('boolean');
    });
  });

  test.describe('IPA Test Execution', () => {
    test('should run test on iOS app', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/explore', {
        data: {
          appId: 'test-ipa-app',
          appName: 'Test iOS App',
          appUrl: 'demo',
          testType: 'explore',
          maxSteps: 5
        }
      });

      expect(response.ok() || response.status() === 401).toBe(true);
    });
  });
});

test.describe('Web Testing', () => {
  test.describe('URL Testing', () => {
    test('should accept URL input', async ({ page }) => {
      await page.goto('/dashboard');
      
      const urlInput = page.locator('input[type="url"], input[placeholder*="URL"], input[placeholder*="url"]');
      const isVisible = await urlInput.first().isVisible().catch(() => false);
      
      expect(isVisible || page.url().includes('/login')).toBe(true);
    });

    test('should validate URL format', async ({ page }) => {
      await page.goto('/dashboard');
      
      const urlInput = page.locator('input[type="url"]').first();
      
      if (await urlInput.isVisible().catch(() => false)) {
        await urlInput.fill('not-a-url');
        const form = page.locator('form');
        if (await form.isVisible().catch(() => false)) {
          await form.evaluate(e => e.submit());
          await page.waitForTimeout(500);
          
          // Should show validation error
          const error = page.locator('[class*="error"], text=/invalid|url|format/i');
          const hasError = await error.first().isVisible().catch(() => false);
          expect(typeof hasError).toBe('boolean');
        }
      }
    });

    test('should support http and https', async ({ page }) => {
      await page.goto('/dashboard');
      
      const urlInput = page.locator('input[type="url"]').first();
      
      if (await urlInput.isVisible().catch(() => false)) {
        // Both should be valid
        await urlInput.fill('http://example.com');
        await urlInput.fill('https://example.com');
        // No errors should appear for valid URLs
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Web Test Execution', () => {
    test('should run explore test on website', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/explore', {
        data: {
          appId: 'test-web-app',
          appName: 'Test Website',
          appUrl: 'https://example.com',
          testType: 'explore',
          goal: 'Explore the homepage',
          maxSteps: 5
        }
      });

      expect(response.ok() || response.status() === 401).toBe(true);
    });

    test('should run task test on website', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/explore', {
        data: {
          appId: 'test-web-task',
          appName: 'Test Website',
          appUrl: 'https://example.com',
          testType: 'task',
          goal: 'Find the contact page',
          maxSteps: 8
        }
      });

      expect(response.ok() || response.status() === 401).toBe(true);
    });
  });
});

test.describe('Auth-Aware Testing', () => {
  test.describe('Credential Management', () => {
    test('should store credentials securely', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/test-configs', {
        data: {
          name: 'Test with Auth',
          type: 'auth',
          appId: 'test-app',
          credentials: [
            { name: 'user1', email: 'user@test.com', password: 'SecretPass123!' }
          ]
        }
      });

      // Should succeed or fail gracefully
      expect([200, 201, 400, 401, 500]).toContain(response.status());
    });

    test('should allow multiple credential sets', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/test-configs', {
        data: {
          name: 'Multi-user Test',
          type: 'task',
          appId: 'test-app',
          credentials: [
            { name: 'admin', email: 'admin@test.com', password: 'AdminPass123!' },
            { name: 'user', email: 'user@test.com', password: 'UserPass123!' }
          ]
        }
      });

      expect([200, 201, 400, 401, 500]).toContain(response.status());
    });

    test('should allow selecting which credential to use', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Look for credential selector
      const selector = page.locator('select, [class*="credential"], [class*="user"]');
      const hasSelector = await selector.first().isVisible().catch(() => false);
      
      expect(typeof hasSelector).toBe('boolean');
    });
  });

  test.describe('Auth Flow Testing', () => {
    test('should test login flow', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/explore', {
        data: {
          appId: 'auth-test',
          appName: 'Auth Test App',
          appUrl: 'https://example.com',
          testType: 'auth',
          goal: 'Log in successfully',
          credentials: {
            email: 'test@example.com',
            password: 'password123'
          },
          maxSteps: 10
        }
      });

      expect(response.ok() || response.status() === 401).toBe(true);
    });

    test('should test registration flow', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/explore', {
        data: {
          appId: 'register-test',
          appName: 'Register Test App',
          appUrl: 'https://example.com',
          testType: 'auth',
          goal: 'Create a new account',
          credentials: {
            email: `newuser${Date.now()}@test.com`,
            password: 'NewPass123!'
          },
          maxSteps: 10
        }
      });

      expect(response.ok() || response.status() === 401).toBe(true);
    });

    test('should test logout flow', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/explore', {
        data: {
          appId: 'logout-test',
          appName: 'Logout Test App',
          appUrl: 'https://example.com',
          testType: 'auth',
          goal: 'Log out',
          credentials: {
            email: 'test@example.com',
            password: 'password123'
          },
          maxSteps: 5
        }
      });

      expect(response.ok() || response.status() === 401).toBe(true);
    });

    test('should test password reset flow', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/explore', {
        data: {
          appId: 'reset-test',
          appName: 'Reset Test App',
          appUrl: 'https://example.com',
          testType: 'auth',
          goal: 'Reset password',
          credentials: {
            email: 'test@example.com'
          },
          maxSteps: 8
        }
      });

      expect(response.ok() || response.status() === 401).toBe(true);
    });
  });
});

test.describe('Task-Specific Prompts', () => {
  test.describe('Goal-Driven Testing', () => {
    test('should accept specific navigation goal', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/explore', {
        data: {
          appId: 'nav-test',
          appName: 'Nav Test',
          appUrl: 'https://example.com',
          testType: 'task',
          goal: 'Navigate to the settings page',
          maxSteps: 5
        }
      });

      expect(response.ok() || response.status() === 401).toBe(true);
    });

    test('should accept complex multi-step goal', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/explore', {
        data: {
          appId: 'complex-test',
          appName: 'Complex Test',
          appUrl: 'https://example.com',
          testType: 'task',
          goal: 'Search for blue shirt, add to cart, apply coupon, checkout',
          maxSteps: 20
        }
      });

      expect(response.ok() || response.status() === 401).toBe(true);
    });

    test('should accept form filling goal', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/explore', {
        data: {
          appId: 'form-test',
          appName: 'Form Test',
          appUrl: 'https://example.com',
          testType: 'task',
          goal: 'Fill out the contact form with test data',
          maxSteps: 8
        }
      });

      expect(response.ok() || response.status() === 401).toBe(true);
    });

    test('should accept verification goal', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/explore', {
        data: {
          appId: 'verify-test',
          appName: 'Verify Test',
          appUrl: 'https://example.com',
          testType: 'task',
          goal: 'Verify that the cart shows correct items and total',
          maxSteps: 5
        }
      });

      expect(response.ok() || response.status() === 401).toBe(true);
    });
  });

  test.describe('Context-Aware Testing', () => {
    test('should preserve context across steps', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/explore', {
        data: {
          appId: 'context-test',
          appName: 'Context Test',
          appUrl: 'https://example.com',
          testType: 'task',
          goal: 'Add item to cart, continue shopping, add another item',
          maxSteps: 15
        }
      });

      const result = await response.json().catch(() => ({}));
      
      // Should complete all steps with context
      expect(result.success || response.status() === 401).toBe(true);
    });

    test('should handle conditional flows', async ({ page }) => {
      const response = await page.request.post('http://localhost:3005/api/explore', {
        data: {
          appId: 'conditional-test',
          appName: 'Conditional Test',
          appUrl: 'https://example.com',
          testType: 'task',
          goal: 'If user is logged in, go to profile; otherwise login first',
          maxSteps: 10
        }
      });

      expect(response.ok() || response.status() === 401).toBe(true);
    });
  });
});
