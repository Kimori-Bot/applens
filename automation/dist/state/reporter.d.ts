/**
 * Reporter - Generates exploration reports
 */
import type { ExplorationReport, Issue, NavigationGraph } from '../types.js';
export interface ReportOptions {
    format?: 'json' | 'html' | 'markdown';
    includeScreens?: boolean;
    includeGraph?: boolean;
}
export declare class Reporter {
    /**
     * Generate a comprehensive exploration report
     */
    static generate(sessionId: string, startTime: Date, endTime: Date, totalActions: number, uniqueScreens: number, uniqueElements: number, issues: Issue[], graph: NavigationGraph): ExplorationReport;
    /**
     * Calculate estimated coverage
     */
    private static calculateCoverage;
    /**
     * Format report as JSON
     */
    static toJSON(report: ExplorationReport): string;
    /**
     * Format report as markdown
     */
    static toMarkdown(report: ExplorationReport): string;
    /**
     * Format report as HTML
     */
    static toHTML(report: ExplorationReport): string;
    /**
     * Get a summary of the report
     */
    static getSummary(report: ExplorationReport): {
        actions: number;
        screens: number;
        elements: number;
        issues: number;
        coverage: number;
    };
}
//# sourceMappingURL=reporter.d.ts.map