/**
 * Reporter - Generates exploration reports
 */

import type { ExplorationReport, Issue, NavigationGraph } from '../types.js';
import { logger } from '../logger.js';

export interface ReportOptions {
  format?: 'json' | 'html' | 'markdown';
  includeScreens?: boolean;
  includeGraph?: boolean;
}

export class Reporter {
  /**
   * Generate a comprehensive exploration report
   */
  static generate(sessionId: string, startTime: Date, endTime: Date, 
    totalActions: number, uniqueScreens: number, uniqueElements: number,
    issues: Issue[], graph: NavigationGraph): ExplorationReport {
    
    const duration = endTime.getTime() - startTime.getTime();
    
    const report: ExplorationReport = {
      sessionId,
      startTime,
      endTime,
      totalActions,
      uniqueScreens,
      uniqueElements,
      issues,
      graph,
      coverage: {
        screensFound: uniqueScreens,
        elementsFound: uniqueElements,
        estimatedCoverage: Reporter.calculateCoverage(uniqueScreens, uniqueElements),
      },
    };
    
    logger.info(`[Reporter] Generated report for session ${sessionId}`);
    
    return report;
  }
  
  /**
   * Calculate estimated coverage
   */
  private static calculateCoverage(screens: number, elements: number): number {
    // Heuristic: assume 20 screens and 100 elements as baseline
    const screenCoverage = Math.min(1, screens / 20);
    const elementCoverage = Math.min(1, elements / 100);
    
    return (screenCoverage * 0.7 + elementCoverage * 0.3);
  }
  
  /**
   * Format report as JSON
   */
  static toJSON(report: ExplorationReport): string {
    return JSON.stringify(report, null, 2);
  }
  
  /**
   * Format report as markdown
   */
  static toMarkdown(report: ExplorationReport): string {
    const lines: string[] = [];
    
    lines.push('# Exploration Report');
    lines.push('');
    lines.push(`**Session ID:** ${report.sessionId}`);
    lines.push(`**Start Time:** ${report.startTime.toISOString()}`);
    lines.push(`**End Time:** ${report.endTime.toISOString()}`);
    lines.push(`**Duration:** ${report.endTime.getTime() - report.startTime.getTime()}ms`);
    lines.push('');
    
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total Actions:** ${report.totalActions}`);
    lines.push(`- **Unique Screens:** ${report.uniqueScreens}`);
    lines.push(`- **Unique Elements:** ${report.uniqueElements}`);
    lines.push(`- **Estimated Coverage:** ${(report.coverage.estimatedCoverage * 100).toFixed(1)}%`);
    lines.push('');
    
    if (report.issues.length > 0) {
      lines.push('## Issues');
      lines.push('');
      
      for (const issue of report.issues) {
        lines.push(`### ${issue.type.toUpperCase()} - ${issue.severity}`);
        lines.push('');
        lines.push(`- **Description:** ${issue.description}`);
        lines.push(`- **Status:** ${issue.status}`);
        lines.push(`- **Timestamp:** ${new Date(issue.timestamp).toISOString()}`);
        lines.push('');
      }
    }
    
    // Navigation graph stats
    const nodeCount = report.graph.nodes.size;
    let edgeCount = 0;
    
    for (const node of report.graph.nodes.values()) {
      edgeCount += node.transitions.size;
    }
    
    lines.push('## Navigation Graph');
    lines.push('');
    lines.push(`- **Nodes (Screens):** ${nodeCount}`);
    lines.push(`- **Edges (Transitions):** ${edgeCount}`);
    lines.push('');
    
    return lines.join('\n');
  }
  
  /**
   * Format report as HTML
   */
  static toHTML(report: ExplorationReport): string {
    const duration = report.endTime.getTime() - report.startTime.getTime();
    
    let issuesHtml = '';
    if (report.issues.length > 0) {
      issuesHtml = `
        <h2>Issues</h2>
        <table>
          <tr>
            <th>Type</th>
            <th>Severity</th>
            <th>Description</th>
            <th>Status</th>
          </tr>
          ${report.issues.map(issue => `
            <tr>
              <td>${issue.type}</td>
              <td>${issue.severity}</td>
              <td>${issue.description}</td>
              <td>${issue.status}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Exploration Report - ${report.sessionId}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          h2 { color: #666; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
          .critical { color: red; }
          .high { color: orange; }
          .medium { color: #999; }
          .low { color: #ccc; }
        </style>
      </head>
      <body>
        <h1>Exploration Report</h1>
        
        <div class="summary">
          <p><strong>Session ID:</strong> ${report.sessionId}</p>
          <p><strong>Start Time:</strong> ${report.startTime.toISOString()}</p>
          <p><strong>End Time:</strong> ${report.endTime.toISOString()}</p>
          <p><strong>Duration:</strong> ${duration}ms</p>
        </div>
        
        <h2>Summary</h2>
        <ul>
          <li><strong>Total Actions:</strong> ${report.totalActions}</li>
          <li><strong>Unique Screens:</strong> ${report.uniqueScreens}</li>
          <li><strong>Unique Elements:</strong> ${report.uniqueElements}</li>
          <li><strong>Estimated Coverage:</strong> ${(report.coverage.estimatedCoverage * 100).toFixed(1)}%</li>
        </ul>
        
        ${issuesHtml}
        
        <h2>Navigation Graph</h2>
        <ul>
          <li><strong>Nodes (Screens):</strong> ${report.graph.nodes.size}</li>
          <li><strong>Edges (Transitions):</strong> ${Array.from(report.graph.nodes.values()).reduce((sum, n) => sum + n.transitions.size, 0)}</li>
        </ul>
      </body>
      </html>
    `;
  }
  
  /**
   * Get a summary of the report
   */
  static getSummary(report: ExplorationReport): {
    actions: number;
    screens: number;
    elements: number;
    issues: number;
    coverage: number;
  } {
    return {
      actions: report.totalActions,
      screens: report.uniqueScreens,
      elements: report.uniqueElements,
      issues: report.issues.length,
      coverage: report.coverage.estimatedCoverage,
    };
  }
}
