/**
 * Input Command - Simulates text input
 */
import { v4 as uuidv4 } from 'uuid';
export function createInputAction(options) {
    return {
        id: uuidv4(),
        type: 'input',
        target: options.element,
        text: options.text,
        x: options.element ? options.element.x + options.element.width / 2 : 187,
        y: options.element ? options.element.y + options.element.height / 2 : 400,
        timestamp: Date.now(),
    };
}
export { createInputAction as input };
//# sourceMappingURL=input.js.map