/**
 * AppLens Automation Engine - Main Entry Point
 * Autonomous AI navigation system that controls apps
 */
import express from 'express';
import type { AutomationSession, AutomationConfig, Issue } from './types.js';
export interface AutomationEngineOptions {
    baseUrl?: string;
    config?: AutomationConfig;
}
declare class AutomationEngine {
    private app;
    private explorer;
    private driver;
    private tracker;
    private session;
    private running;
    private pollingInterval;
    private baseUrl;
    constructor(options?: AutomationEngineOptions);
    /**
     * Setup Express routes for automation control
     */
    private setupRoutes;
    /**
     * Start the automation engine
     */
    start(sessionId: string, strategy?: string): Promise<AutomationSession>;
    /**
     * Start the exploration loop
     */
    private startExplorationLoop;
    /**
     * Stop the automation engine
     */
    stop(): Promise<AutomationSession | null>;
    /**
     * Stop polling interval
     */
    private stopPolling;
    /**
     * Get current status
     */
    getStatus(): {
        running: boolean;
        session: AutomationSession | null;
        screens: number;
        actions: number;
        issues: number;
        strategy: string;
    };
    /**
     * Get exploration report
     */
    getReport(): import("./types.js").ExplorationReport | null;
    /**
     * Detect and track an issue
     */
    detectIssue(issue: Issue): void;
    /**
     * Check if error is critical
     */
    private isCriticalError;
    /**
     * Get Express app for server
     */
    getApp(): express.Application;
    /**
     * Start the server
     */
    listen(port?: number): void;
}
export declare const automationEngine: AutomationEngine;
export { AutomationEngine };
//# sourceMappingURL=index.d.ts.map