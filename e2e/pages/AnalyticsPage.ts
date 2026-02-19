import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AnalyticsPage extends BasePage {
  readonly charts: Locator;
  readonly dateRangePicker: Locator;
  readonly exportButton: Locator;
  readonly metricsCards: Locator;
  readonly performanceGraph: Locator;
  readonly errorRatesGraph: Locator;
  readonly testSummary: Locator;

  constructor(page: Page) {
    super(page);
    this.charts = page.locator('[class*="chart"], [class*="graph"]');
    this.dateRangePicker = page.locator('[class*="date"], [class*="range"]');
    this.exportButton = page.locator('button:has-text("Export")');
    this.metricsCards = page.locator('[class*="metric"], [class*="stat"]');
    this.performanceGraph = page.locator('[class*="performance"]');
    this.errorRatesGraph = page.locator('[class*="error"]');
    this.testSummary = page.locator('[class*="summary"], [class*="overview"]');
  }

  async navigate() {
    await this.goto('/dashboard/analytics');
    await this.waitForPageLoad();
  }

  async getMetrics(): Promise<{ label: string; value: string }[]> {
    const metrics: { label: string; value: string }[] = [];
    const cards = await this.metricsCards.all();
    
    for (const card of cards) {
      const text = await card.textContent();
      if (text) {
        const parts = text.split('\n');
        if (parts.length >= 2) {
          metrics.push({
            label: parts[0].trim(),
            value: parts[1].trim(),
          });
        }
      }
    }
    
    return metrics;
  }

  async exportReport() {
    await this.exportButton.click();
    await this.page.waitForTimeout(1000);
  }

  async selectDateRange(start: string, end: string) {
    await this.dateRangePicker.click();
    await this.page.fill('[class*="start"]', start);
    await this.page.fill('[class*="end"]', end);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  async isChartVisible(chartType: 'performance' | 'errors'): Promise<boolean> {
    const chart = chartType === 'performance' ? this.performanceGraph : this.errorRatesGraph;
    return await chart.isVisible();
  }
}
