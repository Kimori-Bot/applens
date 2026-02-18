/**
 * Random Exploration Strategy
 * Selects elements and actions randomly
 */
import { v4 as uuidv4 } from 'uuid';
export class RandomStrategy {
    constructor(options = {}) {
        this.weights = options.weights || {
            tap: 0.6,
            swipeUp: 0.15,
            swipeDown: 0.1,
            swipeLeft: 0.075,
            swipeRight: 0.075,
            input: 0.05,
        };
        this.priorities = options.priorities || {};
        this.filters = options.filters || {
            excludeElements: [],
            minElementSize: 10,
            requireVisible: true,
            requireEnabled: true,
        };
    }
    /**
     * Decide the next action based on random selection
     */
    decide(screen, elements, visitedScreens) {
        // Select an action type based on weights
        const actionType = this.selectActionType();
        // If it's a tap or input, select an element
        if (actionType === 'tap' || actionType === 'input') {
            const element = this.selectRandomElement(elements);
            if (element) {
                return {
                    id: uuidv4(),
                    type: actionType,
                    target: element,
                    x: element.x + element.width / 2,
                    y: element.y + element.height / 2,
                    timestamp: Date.now(),
                };
            }
        }
        // For swipe actions, generate appropriate action
        if (actionType.startsWith('swipe')) {
            return this.createSwipeAction(actionType);
        }
        // Default to tap if no element selected
        return this.createSwipeAction('swipeUp');
    }
    /**
     * Select an action type based on weights
     */
    selectActionType() {
        const rand = Math.random();
        let cumulative = 0;
        for (const [type, weight] of Object.entries(this.weights)) {
            cumulative += weight;
            if (rand <= cumulative) {
                return type;
            }
        }
        return 'tap';
    }
    /**
     * Select a random element from the available elements
     */
    selectRandomElement(elements) {
        if (elements.length === 0)
            return null;
        const index = Math.floor(Math.random() * elements.length);
        return elements[index];
    }
    /**
     * Create a swipe action
     */
    createSwipeAction(direction) {
        const screenWidth = 375; // Default mobile width
        const screenHeight = 812; // Default mobile height
        let startX = screenWidth / 2;
        let startY = screenHeight / 2;
        let endX = startX;
        let endY = startY;
        const swipeDistance = 200;
        switch (direction) {
            case 'swipeUp':
                endY = startY - swipeDistance;
                break;
            case 'swipeDown':
                endY = startY + swipeDistance;
                break;
            case 'swipeLeft':
                endX = startX - swipeDistance;
                break;
            case 'swipeRight':
                endX = startX + swipeDistance;
                break;
        }
        return {
            id: uuidv4(),
            type: 'swipe',
            direction: direction.replace('swipe', '').toLowerCase(),
            x: startX,
            y: startY,
            timestamp: Date.now(),
        };
    }
    /**
     * Get the priority score for an element
     */
    getElementPriority(element) {
        return this.priorities[element.type] || 0.5;
    }
}
export { RandomStrategy as Strategy };
//# sourceMappingURL=random.js.map