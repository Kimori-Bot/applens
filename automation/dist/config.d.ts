/**
 * Configuration Module for AppLens Automation Engine
 */
import type { AutomationConfig, StrategyConfig } from './types.js';
declare const DEFAULT_CONFIG: AutomationConfig;
declare class Config {
    private static instance;
    private config;
    private configPath;
    private constructor();
    static getInstance(): Config;
    private loadConfig;
    private mergeConfig;
    get(): AutomationConfig;
    getStrategy(): StrategyConfig;
    getActionWeights(): Record<string, number>;
    getElementPriorities(): Record<string, number>;
    getFilters(): {
        excludeElements: string[];
        minElementSize: number;
        requireVisible: boolean;
        requireEnabled: boolean;
    };
    getLimits(): {
        maxActionsPerSession: number;
        maxTimePerSession: number;
        maxRetries: number;
        actionDelay: number;
        stateStabilityCheck: boolean;
        maxSameStateCount: number;
    };
    getLogging(): {
        enabled: boolean;
        level: "debug" | "info" | "warn" | "error";
        logActions: boolean;
        logDecisions: boolean;
        logErrors: boolean;
    };
    update(newConfig: Partial<AutomationConfig>): void;
    reset(): void;
    save(): void;
}
export declare const config: Config;
export { Config, DEFAULT_CONFIG };
//# sourceMappingURL=config.d.ts.map