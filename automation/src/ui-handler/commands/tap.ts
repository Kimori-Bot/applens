/**
 * Tap Command - Simulates a tap/click action
 */

import { v4 as uuidv4 } from 'uuid';
import type { Action, UIElement } from '../../types.js';

export interface TapOptions {
  x?: number;
  y?: number;
  element?: UIElement;
}

export function createTapAction(options: TapOptions): Action {
  let x = options.x;
  let y = options.y;
  let target = options.element;
  
  // If element provided, tap its center
  if (target) {
    x = target.x + target.width / 2;
    y = target.y + target.height / 2;
  }
  
  // Default to center of screen if no coordinates
  x = x ?? 187;
  y = y ?? 400;
  
  return {
    id: uuidv4(),
    type: 'tap',
    target,
    x,
    y,
    timestamp: Date.now(),
  };
}

export { createTapAction as tap };
