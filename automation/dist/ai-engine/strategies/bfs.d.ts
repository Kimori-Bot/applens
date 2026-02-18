/**
 * Breadth-First Exploration Strategy
 * Explores all elements at current depth before going deeper
 */
import type { ScreenState, UIElement, Action, AutomationConfig } from '../../types.js';
export interface StrategyOptions {
    priorities?: Record<string, number>;
    filters?: AutomationConfig['filters'];
}
export declare class BFSStrategy {
    private priorities;
    private filters;
    private queue;
    private currentIndex;
    constructor(options?: StrategyOptions);
    /**
     * Decide the next action using BFS
     */
    decide(screen: ScreenState, elements: UIElement[], visitedScreens: Set<string>): Action;
    /**
     * Check if element is already in queue
     */
    private isElementQueued;
    /**
     * Create a swipe action when queue is empty
     */
    private createSwipeAction;
    /**
     * Reset the strategy state
     */
    reset(): void;
}
export { BFSStrategy as Strategy };
//# sourceMappingURL=bfs.d.ts.map