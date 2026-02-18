/**
 * Depth-First Exploration Strategy
 * Goes deep into navigation paths before exploring siblings
 */
import type { ScreenState, UIElement, Action, AutomationConfig } from '../../types.js';
export interface StrategyOptions {
    priorities?: Record<string, number>;
    filters?: AutomationConfig['filters'];
    maxDepth?: number;
}
export declare class DFSStrategy {
    private priorities;
    private filters;
    private maxDepth;
    private stack;
    private currentDepth;
    constructor(options?: StrategyOptions);
    /**
     * Decide the next action using DFS
     */
    decide(screen: ScreenState, elements: UIElement[], visitedScreens: Set<string>): Action;
    /**
     * Check if element is already in stack
     */
    private isElementInStack;
    /**
     * Create a swipe action when stack is empty
     */
    private createSwipeAction;
    /**
     * Reset the strategy state
     */
    reset(): void;
}
export { DFSStrategy as Strategy };
//# sourceMappingURL=dfs.d.ts.map