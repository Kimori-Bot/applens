/**
 * AI Explorer - Main exploration decision engine
 * Decides what action to take based on current screen state
 */
import type { ScreenState, Action, AutomationConfig } from '../types.js';
export interface ExplorerOptions {
    strategy?: 'random' | 'bfs' | 'dfs' | 'smart';
    config?: AutomationConfig;
}
export declare class AIExplorer {
    private strategy;
    private currentStrategy;
    private consecutiveRandom;
    private maxConsecutiveRandom;
    private visitedScreens;
    private screenElements;
    private elementPriorities;
    private actionWeights;
    private filters;
    constructor(options?: ExplorerOptions);
    private createStrategy;
    /**
     * Analyze the current screen and decide the next action
     */
    decide(screen: ScreenState): Action;
    /**
     * Filter elements based on configuration
     */
    private filterElements;
    /**
     * Generate a hash for a screen to track uniqueness
     */
    private hashScreen;
    /**
     * Create a back navigation action
     */
    private createBackAction;
    /**
     * Switch to a different strategy
     */
    switchStrategy(strategy: 'random' | 'bfs' | 'dfs' | 'smart'): void;
    /**
     * Get current strategy
     */
    getStrategy(): string;
    /**
     * Get visited screens count
     */
    getVisitedCount(): number;
    /**
     * Reset exploration state
     */
    reset(): void;
    /**
     * Get all visited screen hashes
     */
    getVisitedScreens(): Set<string>;
}
export { AIExplorer as Explorer };
//# sourceMappingURL=explorer.d.ts.map