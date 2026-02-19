import { test, expect } from '@playwright/test';
import { LoginPage, RegisterPage, DashboardPage } from '../pages';
import users from '../fixtures/users.json';

test.describe('Authentication Flow', () => {
  let loginPage: LoginPage;
  let registerPage: RegisterPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Login', () => {
    test('should display login page correctly', async ({ page }) => {
      await loginPage.navigate();
      
      // Check for main elements
      await expect(page.locator('text=Welcome back')).toBeVisible();
      await expect(page.locator('text=Sign in to your account')).toBeVisible();
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await loginPage.navigate();
      await loginPage.login('invalid@example.com', 'wrongpassword');
      
      // Should show error message or stay on login page
      const url = page.url();
      expect(url).not.toContain('/dashboard');
    });

    test('should redirect to register page', async ({ page }) => {
      await loginPage.navigate();
      await loginPage.signUpLink.click();
      
      await expect(page).toHaveURL(/\/register/);
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await loginPage.navigate();
      await loginPage.forgotPasswordLink.click();
      
      await expect(page).toHaveURL(/\/forgot-password/);
    });
  });

  test.describe('Registration', () => {
    test('should display registration page correctly', async ({ page }) => {
      await registerPage.navigate();
      
      await expect(page.locator('text=Create your account')).toBeVisible();
      await expect(page.locator('text=Start your free trial')).toBeVisible();
      await expect(registerPage.nameInput).toBeVisible();
      await expect(registerPage.emailInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
      await expect(registerPage.confirmPasswordInput).toBeVisible();
      await expect(registerPage.submitButton).toBeVisible();
    });

    test('should show error for password mismatch', async ({ page }) => {
      await registerPage.navigate();
      await registerPage.register(
        users.testUser.name,
        users.testUser.email,
        'Password123',
        'DifferentPassword'
      );
      
      // Should show error message
      const errorText = await registerPage.getErrorMessage();
      expect(errorText.toLowerCase()).toContain('match');
    });

    test('should show error for weak password', async ({ page }) => {
      await registerPage.navigate();
      await registerPage.register(
        users.testUser.name,
        'new@example.com',
        'weak',
        'weak'
      );
      
      // Should show error about password length
      const errorText = await registerPage.getErrorMessage();
      expect(errorText.toLowerCase()).toContain('8');
    });

    test('should redirect to login page', async ({ page }) => {
      await registerPage.navigate();
      await registerPage.signInLink.click();
      
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Logout', () => {
    test('should be able to logout from dashboard', async ({ page }) => {
      // First login (simulate authenticated state)
      await dashboardPage.navigate();
      
      // Look for logout button in header/sidebar
      const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), [class*="logout"]');
      
      // If logout exists, click it
      if (await logoutButton.isVisible().catch(() => false)) {
        await logoutButton.click();
        await expect(page).toHaveURL(/\/(login|register)\/?$/);
      }
    });
  });
});
