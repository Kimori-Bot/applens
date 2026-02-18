/**
 * Swipe Command - Simulates a swipe gesture
 */
import type { Action } from '../../types.js';
export interface SwipeOptions {
    direction: 'up' | 'down' | 'left' | 'right';
    startX?: number;
    startY?: number;
    distance?: number;
    duration?: number;
}
export declare function createSwipeAction(options: SwipeOptions): Action;
export { createSwipeAction as swipe };
//# sourceMappingURL=swipe.d.ts.map