/**
 * Logger Utility for AppLens Automation Engine
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
class Logger {
    constructor(config = { level: LogLevel.INFO }) {
        this.level = config.level;
        this.prefix = config.prefix || '[Automation]';
        this.timestamp = config.timestamp !== false;
    }
    formatMessage(level, message, ...args) {
        const parts = [];
        if (this.timestamp) {
            parts.push(new Date().toISOString());
        }
        parts.push(`${this.prefix} [${level}]`);
        parts.push(message);
        if (args.length > 0) {
            parts.push(...args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)));
        }
        return parts.join(' ');
    }
    debug(message, ...args) {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(this.formatMessage('DEBUG', message, ...args));
        }
    }
    info(message, ...args) {
        if (this.level <= LogLevel.INFO) {
            console.info(this.formatMessage('INFO', message, ...args));
        }
    }
    warn(message, ...args) {
        if (this.level <= LogLevel.WARN) {
            console.warn(this.formatMessage('WARN', message, ...args));
        }
    }
    error(message, ...args) {
        if (this.level <= LogLevel.ERROR) {
            console.error(this.formatMessage('ERROR', message, ...args));
        }
    }
    setLevel(level) {
        this.level = level;
    }
    setPrefix(prefix) {
        this.prefix = prefix;
    }
}
// Default logger instance
export const logger = new Logger({
    level: LogLevel.INFO,
    prefix: '[AppLens]',
    timestamp: true,
});
// Export factory function
export function createLogger(config) {
    return new Logger({
        level: config.level ?? LogLevel.INFO,
        prefix: config.prefix ?? '[AppLens]',
        timestamp: config.timestamp ?? true,
    });
}
export { Logger };
//# sourceMappingURL=logger.js.map