import { test, expect } from '@playwright/test';
import { DashboardPage, AppDetailPage } from '../pages';

test.describe('AI Exploration', () => {
  const testApp = {
    name: 'E2E Test App',
    url: 'https://example.com',
    type: 'web'
  };

  test('should run explore test in demo mode', async ({ page }) => {
    // Call explore API with demo mode
    const response = await page.request.post('http://localhost:3000/api/explore', {
      data: {
        appId: 'test-app-id',
        appName: 'Test App',
        appUrl: 'https://example.com/demo',
        testType: 'explore',
        goal: 'Explore the app',
        maxSteps: 5
      }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    // Should return demo results
    expect(result.success).toBe(true);
    expect(result.demo).toBe(true);
    expect(result.steps).toHaveLength(5);
    expect(result.healthScore).toBe(85);
  });

  test('should run auth test in demo mode', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/explore', {
      data: {
        appId: 'test-app-id',
        appName: 'Test App',
        appUrl: 'https://example.com',
        testType: 'auth',
        credentials: {
          email: 'test@example.com',
          password: 'testpass123'
        },
        maxSteps: 5
      }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.testType).toBe('auth');
    expect(result.steps).toBeDefined();
  });

  test('should run task test in demo mode', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/explore', {
      data: {
        appId: 'test-app-id',
        appName: 'Test App',
        appUrl: 'https://example.com',
        testType: 'task',
        goal: 'Complete checkout flow',
        maxSteps: 8
      }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.testType).toBe('task');
    expect(result.goal).toBe('Complete checkout flow');
  });

  test('should validate required fields', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/explore', {
      data: {
        appName: 'Test App'
        // Missing appUrl
      }
    });

    expect(response.status()).toBe(400);
    const result = await response.json();
    expect(result.error).toContain('appUrl');
  });

  test('should generate test cases from exploration', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/explore', {
      data: {
        appId: 'test-app-id',
        appName: 'Test App',
        appUrl: 'https://example.com/demo',
        maxSteps: 3
      }
    });

    const result = await response.json();
    
    // Should generate test cases
    expect(result.generatedTests).toBeDefined();
    expect(result.generatedTests.length).toBeGreaterThan(0);
    expect(result.generatedTests[0]).toHaveProperty('id');
    expect(result.generatedTests[0]).toHaveProperty('action');
    expect(result.generatedTests[0]).toHaveProperty('element');
  });
});

test.describe('Smart AI Engine', () => {
  test('should detect intent from goal', async ({ page }) => {
    // Test with specific goal - should influence AI decisions
    const response = await page.request.post('http://localhost:3000/api/explore', {
      data: {
        appId: 'test-app-id',
        appName: 'Ecommerce App',
        appUrl: 'https://example.com/demo',
        goal: 'Find and buy a blue shirt',
        testType: 'task',
        maxSteps: 5
      }
    });

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.goal).toBe('Find and buy a blue shirt');
  });

  test('should use credentials for auth flow', async ({ page }) => {
    const credentials = {
      email: 'user@example.com',
      password: 'SecurePass123!'
    };

    const response = await page.request.post('http://localhost:3000/api/explore', {
      data: {
        appId: 'test-app-id',
        appName: 'Auth Test App',
        appUrl: 'https://example.com/demo',
        testType: 'auth',
        credentials,
        maxSteps: 4
      }
    });

    const result = await response.json();
    // Demo mode should include credential-related steps
    expect(result.success).toBe(true);
  });

  test('should respect maxSteps parameter', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/explore', {
      data: {
        appId: 'test-app-id',
        appName: 'Test App',
        appUrl: 'https://example.com/demo',
        maxSteps: 3
      }
    });

    const result = await response.json();
    expect(result.steps).toHaveLength(3);
  });

  test('should allow custom AI model selection', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/explore', {
      data: {
        appId: 'test-app-id',
        appName: 'Test App',
        appUrl: 'https://example.com/demo',
        model: 'llama3.2:latest',
        maxSteps: 2
      }
    });

    const result = await response.json();
    expect(result.success).toBe(true);
  });
});

test.describe('Goal-Driven Testing', () => {
  test('should accept specific navigation goal', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/explore', {
      data: {
        appId: 'test-app-id',
        appName: 'Test App',
        appUrl: 'https://example.com/demo',
        goal: 'Navigate to settings page',
        testType: 'task',
        maxSteps: 5
      }
    });

    const result = await response.json();
    expect(result.goal).toBe('Navigate to settings page');
    expect(result.success).toBe(true);
  });

  test('should accept complex multi-step goal', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/explore', {
      data: {
        appId: 'test-app-id',
        appName: 'Complex Test App',
        appUrl: 'https://example.com/demo',
        goal: 'Login, add item to cart, proceed to checkout, enter payment info',
        testType: 'task',
        maxSteps: 10
      }
    });

    const result = await response.json();
    expect(result.success).toBe(true);
    // Should have more steps for complex goal
    expect(result.steps.length).toBeGreaterThanOrEqual(5);
  });

  test('should track step reasoning', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/explore', {
      data: {
        appId: 'test-app-id',
        appName: 'Test App',
        appUrl: 'https://example.com/demo',
        goal: 'Test the app',
        maxSteps: 3
      }
    });

    const result = await response.json();
    expect(result.reasoning).toBeDefined();
    expect(result.reasoning.length).toBeGreaterThan(0);
  });
});
