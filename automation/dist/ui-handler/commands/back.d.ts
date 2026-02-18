/**
 * Back Command - Simulates back navigation
 */
import type { Action } from '../../types.js';
export interface BackOptions {
    count?: number;
}
export declare function createBackAction(options?: BackOptions): Action;
export { createBackAction as back };
//# sourceMappingURL=back.d.ts.map