/**
 * Breadth-First Exploration Strategy
 * Explores all elements at current depth before going deeper
 */
import { v4 as uuidv4 } from 'uuid';
export class BFSStrategy {
    constructor(options = {}) {
        this.queue = [];
        this.currentIndex = 0;
        this.priorities = options.priorities || {};
        this.filters = options.filters || {
            excludeElements: [],
            minElementSize: 10,
            requireVisible: true,
            requireEnabled: true,
        };
    }
    /**
     * Decide the next action using BFS
     */
    decide(screen, elements, visitedScreens) {
        // Add new elements to queue
        for (const element of elements) {
            if (!this.isElementQueued(element)) {
                this.queue.push(element);
            }
        }
        // Get next element from queue
        if (this.queue.length === 0) {
            return this.createSwipeAction('up');
        }
        const element = this.queue.shift();
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
     * Check if element is already in queue
     */
    isElementQueued(element) {
        return this.queue.some(e => e.id === element.id);
    }
    /**
     * Create a swipe action when queue is empty
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
        this.queue = [];
        this.currentIndex = 0;
    }
}
export { BFSStrategy as Strategy };
//# sourceMappingURL=bfs.js.map