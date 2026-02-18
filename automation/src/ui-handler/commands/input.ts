/**
 * Input Command - Simulates text input
 */

import { v4 as uuidv4 } from 'uuid';
import type { Action, UIElement } from '../../types.js';

export interface InputOptions {
  text: string;
  element?: UIElement;
  clearFirst?: boolean;
}

export function createInputAction(options: InputOptions): Action {
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
