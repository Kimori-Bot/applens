/**
 * Logger Utility for AppLens Automation Engine
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  timestamp?: boolean;
}

class Logger {
  private level: LogLevel;
  private prefix: string;
  private timestamp: boolean;
  
  constructor(config: LoggerConfig = { level: LogLevel.INFO }) {
    this.level = config.level;
    this.prefix = config.prefix || '[Automation]';
    this.timestamp = config.timestamp !== false;
  }
  
  private formatMessage(level: string, message: string, ...args: unknown[]): string {
    const parts = [];
    
    if (this.timestamp) {
      parts.push(new Date().toISOString());
    }
    
    parts.push(`${this.prefix} [${level}]`);
    parts.push(message);
    
    if (args.length > 0) {
      parts.push(...args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ));
    }
    
    return parts.join(' ');
  }
  
  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, ...args));
    }
  }
  
  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, ...args));
    }
  }
  
  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }
  
  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, ...args));
    }
  }
  
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  setPrefix(prefix: string): void {
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
export function createLogger(config: Partial<LoggerConfig>): Logger {
  return new Logger({
    level: config.level ?? LogLevel.INFO,
    prefix: config.prefix ?? '[AppLens]',
    timestamp: config.timestamp ?? true,
  });
}

export { Logger };
