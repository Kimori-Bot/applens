/**
 * Logger Utility for AppLens Automation Engine
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
export interface LoggerConfig {
    level: LogLevel;
    prefix?: string;
    timestamp?: boolean;
}
declare class Logger {
    private level;
    private prefix;
    private timestamp;
    constructor(config?: LoggerConfig);
    private formatMessage;
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    setLevel(level: LogLevel): void;
    setPrefix(prefix: string): void;
}
export declare const logger: Logger;
export declare function createLogger(config: Partial<LoggerConfig>): Logger;
export { Logger };
//# sourceMappingURL=logger.d.ts.map