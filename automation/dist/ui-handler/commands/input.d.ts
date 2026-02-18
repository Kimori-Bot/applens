/**
 * Input Command - Simulates text input
 */
import type { Action, UIElement } from '../../types.js';
export interface InputOptions {
    text: string;
    element?: UIElement;
    clearFirst?: boolean;
}
export declare function createInputAction(options: InputOptions): Action;
export { createInputAction as input };
//# sourceMappingURL=input.d.ts.map