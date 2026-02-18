/**
 * Random Exploration Strategy
 * Selects elements and actions randomly
 */
import type { ScreenState, UIElement, Action, AutomationConfig } from '../../types.js';
export interface StrategyOptions {
    weights?: Record<string, number>;
    priorities?: Record<string, number>;
    filters?: AutomationConfig['filters'];
}
export declare class RandomStrategy {
    private weights;
    private priorities;
    private filters;
    constructor(options?: StrategyOptions);
    /**
     * Decide the next action based on random selection
     */
    decide(screen: ScreenState, elements: UIElement[], visitedScreens: Set<string>): Action;
    /**
     * Select an action type based on weights
     */
    private selectActionType;
    /**
     * Select a random element from the available elements
     */
    private selectRandomElement;
    /**
     * Create a swipe action
     */
    private createSwipeAction;
    /**
     * Get the priority score for an element
     */
    getElementPriority(element: UIElement): number;
}
export { RandomStrategy as Strategy };
//# sourceMappingURL=random.d.ts.map