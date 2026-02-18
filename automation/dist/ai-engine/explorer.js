/**
 * AI Explorer - Main exploration decision engine
 * Decides what action to take based on current screen state
 */
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { events } from '../event-bus.js';
import { RandomStrategy } from './strategies/random.js';
import { BFSStrategy } from './strategies/bfs.js';
import { DFSStrategy } from './strategies/dfs.js';
import { SmartStrategy } from './strategies/smart.js';
export class AIExplorer {
    constructor(options = {}) {
        this.consecutiveRandom = 0;
        this.visitedScreens = new Set();
        this.screenElements = new Map();
        this.currentStrategy = options.strategy || 'smart';
        this.maxConsecutiveRandom = options.config?.strategy?.randomExploration?.maxConsecutiveRandom || 5;
        this.elementPriorities = options.config?.elementPriorities || config.getElementPriorities();
        this.actionWeights = options.config?.actionWeights || config.getActionWeights();
        this.filters = options.config?.filters || config.getFilters();
        this.strategy = this.createStrategy(this.currentStrategy);
        logger.info(`[AIExplorer] Initialized with ${this.currentStrategy} strategy`);
    }
    createStrategy(type) {
        switch (type) {
            case 'random':
                return new RandomStrategy({
                    weights: this.actionWeights,
                    priorities: this.elementPriorities,
                    filters: this.filters,
                });
            case 'bfs':
                return new BFSStrategy({
                    priorities: this.elementPriorities,
                    filters: this.filters,
                });
            case 'dfs':
                return new DFSStrategy({
                    priorities: this.elementPriorities,
                    filters: this.filters,
                    maxDepth: config.getStrategy().depthFirst.maxDepth,
                });
            case 'smart':
            default:
                return new SmartStrategy({
                    weights: this.actionWeights,
                    priorities: this.elementPriorities,
                    filters: this.filters,
                    maxConsecutiveRandom: this.maxConsecutiveRandom,
                });
        }
    }
    /**
     * Analyze the current screen and decide the next action
     */
    decide(screen) {
        // Record visited screen
        const screenHash = this.hashScreen(screen);
        if (!this.visitedScreens.has(screenHash)) {
            this.visitedScreens.add(screenHash);
            this.screenElements.set(screenHash, screen.elements);
            events.emitScreenVisited(screen);
            logger.info(`[AIExplorer] New screen discovered: ${screen.name} (${screen.id})`);
        }
        // Apply filters to elements
        const filteredElements = this.filterElements(screen.elements);
        if (filteredElements.length === 0) {
            logger.warn('[AIExplorer] No valid elements found, generating back action');
            return this.createBackAction();
        }
        // Decide action based on current strategy
        let action;
        // For smart strategy, check if we should switch strategies
        if (this.currentStrategy === 'smart') {
            const smartStrategy = this.strategy;
            // Check if we need to fall back to random exploration
            if (smartStrategy.shouldUseRandom()) {
                this.consecutiveRandom++;
                if (this.consecutiveRandom >= this.maxConsecutiveRandom) {
                    logger.info('[AIExplorer] Switching to random exploration');
                    this.strategy = new RandomStrategy({
                        weights: this.actionWeights,
                        priorities: this.elementPriorities,
                        filters: this.filters,
                    });
                }
            }
            else {
                this.consecutiveRandom = 0;
            }
            // Get next action from smart strategy
            action = this.strategy.decide(screen, filteredElements, this.visitedScreens);
        }
        else {
            // Use the current strategy directly
            action = this.strategy.decide(screen, filteredElements, this.visitedScreens);
        }
        logger.debug(`[AIExplorer] Decided action: ${action.type} on element: ${action.target?.label || 'none'}`);
        return action;
    }
    /**
     * Filter elements based on configuration
     */
    filterElements(elements) {
        return elements.filter(element => {
            // Check exclude list
            const label = (element.label || element.text || '').toLowerCase();
            for (const exclude of this.filters.excludeElements) {
                if (label.includes(exclude.toLowerCase())) {
                    return false;
                }
            }
            // Check size
            if (element.width < this.filters.minElementSize || element.height < this.filters.minElementSize) {
                return false;
            }
            // Check visibility
            if (this.filters.requireVisible && !element.visible) {
                return false;
            }
            // Check enabled
            if (this.filters.requireEnabled && !element.enabled) {
                return false;
            }
            return true;
        });
    }
    /**
     * Generate a hash for a screen to track uniqueness
     */
    hashScreen(screen) {
        // Use screen ID if available, otherwise hash elements
        if (screen.hash)
            return screen.hash;
        // Simple hash based on element count and types
        const elementSignature = screen.elements
            .map((e) => `${e.type}:${e.label || ''}`)
            .sort()
            .join('|');
        return `${screen.name}:${elementSignature}`.length.toString(36);
    }
    /**
     * Create a back navigation action
     */
    createBackAction() {
        return {
            id: uuidv4(),
            type: 'back',
            timestamp: Date.now(),
        };
    }
    /**
     * Switch to a different strategy
     */
    switchStrategy(strategy) {
        const oldStrategy = this.currentStrategy;
        this.currentStrategy = strategy;
        this.strategy = this.createStrategy(strategy);
        this.consecutiveRandom = 0;
        events.emitStrategyChanged(oldStrategy, strategy);
        logger.info(`[AIExplorer] Strategy switched from ${oldStrategy} to ${strategy}`);
    }
    /**
     * Get current strategy
     */
    getStrategy() {
        return this.currentStrategy;
    }
    /**
     * Get visited screens count
     */
    getVisitedCount() {
        return this.visitedScreens.size;
    }
    /**
     * Reset exploration state
     */
    reset() {
        this.visitedScreens.clear();
        this.screenElements.clear();
        this.consecutiveRandom = 0;
        logger.info('[AIExplorer] State reset');
    }
    /**
     * Get all visited screen hashes
     */
    getVisitedScreens() {
        return new Set(this.visitedScreens);
    }
}
export { AIExplorer as Explorer };
//# sourceMappingURL=explorer.js.map