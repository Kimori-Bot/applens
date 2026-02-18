/**
 * Swipe Command - Simulates a swipe gesture
 */
import { v4 as uuidv4 } from 'uuid';
export function createSwipeAction(options) {
    const { direction, startX = 187, startY = 400, distance = 200, duration = 300, } = options;
    let endX = startX;
    let endY = startY;
    switch (direction) {
        case 'up':
            endY = startY - distance;
            break;
        case 'down':
            endY = startY + distance;
            break;
        case 'left':
            endX = startX - distance;
            break;
        case 'right':
            endX = startX + distance;
            break;
    }
    return {
        id: uuidv4(),
        type: 'swipe',
        direction,
        x: startX,
        y: startY,
        timestamp: Date.now(),
    };
}
export { createSwipeAction as swipe };
//# sourceMappingURL=swipe.js.map