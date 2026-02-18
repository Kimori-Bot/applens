/**
 * Depth-First Exploration Strategy
 * Goes deep into navigation paths before exploring siblings
 */
import { v4 as uuidv4 } from 'uuid';
export class DFSStrategy {
    constructor(options = {}) {
        this.stack = [];
        this.currentDepth = 0;
        this.priorities = options.priorities || {};
        this.filters = options.filters || {
            excludeElements: [],
            minElementSize: 10,
            requireVisible: true,
            requireEnabled: true,
        };
        this.maxDepth = options.maxDepth || 10;
    }
    /**
     * Decide the next action using DFS
     */
    decide(screen, elements, visitedScreens) {
        // Add new elements to stack (at front for LIFO)
        for (const element of elements) {
            if (!this.isElementInStack(element)) {
                this.stack.unshift(element);
            }
        }
        // Get next element from stack
        if (this.stack.length === 0) {
            return this.createSwipeAction('up');
        }
        const element = this.stack.shift();
        this.currentDepth++;
        return {
            id: uuidv4(),
            type: 'tap',
            target: element,
            x: element.x + element.width / 2,
            y: element.y + element.height / 2,
            timestamp: Date.now(),
        };
    }
    /**
     * Check if element is already in stack
     */
    isElementInStack(element) {
        return this.stack.some(e => e.id === element.id);
    }
    /**
     * Create a swipe action when stack is empty
     */
    createSwipeAction(direction) {
        return {
            id: uuidv4(),
            type: 'swipe',
            direction: direction,
            x: 187, // Center of default mobile width
            y: 400, // Center of default mobile height
            timestamp: Date.now(),
        };
    }
    /**
     * Reset the strategy state
     */
    reset() {
        this.stack = [];
        this.currentDepth = 0;
    }
}
export { DFSStrategy as Strategy };
//# sourceMappingURL=dfs.js.map