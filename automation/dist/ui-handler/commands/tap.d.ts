/**
 * Tap Command - Simulates a tap/click action
 */
import type { Action, UIElement } from '../../types.js';
export interface TapOptions {
    x?: number;
    y?: number;
    element?: UIElement;
}
export declare function createTapAction(options: TapOptions): Action;
export { createTapAction as tap };
//# sourceMappingURL=tap.d.ts.map