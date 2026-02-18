/**
 * Back Command - Simulates back navigation
 */

import { v4 as uuidv4 } from 'uuid';
import type { Action } from '../../types.js';

export interface BackOptions {
  count?: number;
}

export function createBackAction(options: BackOptions = {}): Action {
  return {
    id: uuidv4(),
    type: 'back',
    timestamp: Date.now(),
  };
}

export { createBackAction as back };
