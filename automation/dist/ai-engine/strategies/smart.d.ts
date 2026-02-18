/**
 * Smart Exploration Strategy
 * Combines multiple strategies for optimal exploration
 */
import type { ScreenState, UIElement, Action, AutomationConfig } from '../../types.js';
export interface StrategyOptions {
    weights?: Record<string, number>;
    priorities?: Record<string, number>;
    filters?: AutomationConfig['filters'];
    maxConsecutiveRandom?: number;
}
export declare class SmartStrategy {
    private weights;
    private priorities;
    private filters;
    private maxConsecutiveRandom;
    private consecutiveRandomCount;
    private usedElements;
    private lastAction;
    constructor(options?: StrategyOptions);
    /**
     * Decide the next action using smart strategy
     */
    decide(screen: ScreenState, elements: UIElement[], visitedScreens: Set<string>): Action;
    /**
     * Determine if we should use random exploration
     */
    shouldUseRandom(): boolean;
    /**
     * Check if element is interactive
     */
    private isInteractive;
    /**
     * Get priority score for an element
     */
    private getPriority;
    /**
     * Create a smart swipe action
     */
    private createSmartSwipeAction;
    /**
     * Reset the strategy state
     */
    reset(): void;
}
export { SmartStrategy as Strategy };
//# sourceMappingURL=smart.d.ts.map