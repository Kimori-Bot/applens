/**
 * Configuration Module for AppLens Automation Engine
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AutomationConfig, StrategyConfig } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration
const DEFAULT_CONFIG: AutomationConfig = {
  strategy: {
    randomExploration: {
      enabled: true,
      weight: 0.3,
      maxConsecutiveRandom: 5,
    },
    smartExploration: {
      enabled: true,
      weight: 0.7,
      preferUnvisited: true,
      prioritizeInteractive: true,
    },
    depthFirst: {
      enabled: false,
      maxDepth: 10,
    },
    breadthFirst: {
      enabled: true,
      maxScreens: 50,
    },
  },
  actionWeights: {
    tap: 0.6,
    swipeUp: 0.15,
    swipeDown: 0.1,
    swipeLeft: 0.075,
    swipeRight: 0.075,
    input: 0.05,
  },
  elementPriorities: {
    button: 1.0,
    link: 0.9,
    text: 0.3,
    input: 0.8,
    image: 0.2,
    listItem: 0.7,
    header: 0.1,
    tab: 0.85,
    menu: 0.75,
    drawer: 0.6,
  },
  filters: {
    excludeElements: ['skip', 'close', 'cancel', 'back', 'dismiss'],
    minElementSize: 10,
    requireVisible: true,
    requireEnabled: true,
  },
  limits: {
    maxActionsPerSession: 500,
    maxTimePerSession: 3600000,
    maxRetries: 3,
    actionDelay: 1000,
    stateStabilityCheck: true,
    maxSameStateCount: 5,
  },
  logging: {
    enabled: true,
    level: 'info',
    logActions: true,
    logDecisions: true,
    logErrors: true,
  },
};

class Config {
  private static instance: Config;
  private config: AutomationConfig;
  private configPath: string;
  
  private constructor() {
    this.configPath = path.join(__dirname, '..', 'config', 'exploration-strategy.json');
    this.config = this.loadConfig();
  }
  
  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }
  
  private loadConfig(): AutomationConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf-8');
        const fileConfig = JSON.parse(fileContent);
        
        // Merge with defaults
        return this.mergeConfig(DEFAULT_CONFIG, fileConfig);
      }
    } catch (error) {
      console.warn(`[Config] Failed to load config from ${this.configPath}, using defaults:`, error);
    }
    
    return { ...DEFAULT_CONFIG };
  }
  
  private mergeConfig(defaults: AutomationConfig, overrides: Partial<AutomationConfig>): AutomationConfig {
    return {
      ...defaults,
      ...overrides,
      strategy: {
        ...defaults.strategy,
        ...overrides.strategy,
        randomExploration: {
          ...defaults.strategy.randomExploration,
          ...(overrides.strategy?.randomExploration || {}),
        },
        smartExploration: {
          ...defaults.strategy.smartExploration,
          ...(overrides.strategy?.smartExploration || {}),
        },
        depthFirst: {
          ...defaults.strategy.depthFirst,
          ...(overrides.strategy?.depthFirst || {}),
        },
        breadthFirst: {
          ...defaults.strategy.breadthFirst,
          ...(overrides.strategy?.breadthFirst || {}),
        },
      },
      actionWeights: {
        ...defaults.actionWeights,
        ...overrides.actionWeights,
      },
      elementPriorities: {
        ...defaults.elementPriorities,
        ...overrides.elementPriorities,
      },
      filters: {
        ...defaults.filters,
        ...overrides.filters,
      },
      limits: {
        ...defaults.limits,
        ...overrides.limits,
      },
      logging: {
        ...defaults.logging,
        ...overrides.logging,
      },
    };
  }
  
  get(): AutomationConfig {
    return { ...this.config };
  }
  
  getStrategy(): StrategyConfig {
    return { ...this.config.strategy };
  }
  
  getActionWeights(): Record<string, number> {
    return { ...this.config.actionWeights };
  }
  
  getElementPriorities(): Record<string, number> {
    return { ...this.config.elementPriorities };
  }
  
  getFilters() {
    return { ...this.config.filters };
  }
  
  getLimits() {
    return { ...this.config.limits };
  }
  
  getLogging() {
    return { ...this.config.logging };
  }
  
  update(newConfig: Partial<AutomationConfig>): void {
    this.config = this.mergeConfig(this.config, newConfig);
  }
  
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
  }
  
  save(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('[Config] Failed to save config:', error);
    }
  }
}

// Export singleton instance
export const config = Config.getInstance();

// Export class for testing
export { Config, DEFAULT_CONFIG };
