/**
 * Back Command - Simulates back navigation
 */
import { v4 as uuidv4 } from 'uuid';
export function createBackAction(options = {}) {
    return {
        id: uuidv4(),
        type: 'back',
        timestamp: Date.now(),
    };
}
export { createBackAction as back };
//# sourceMappingURL=back.js.map