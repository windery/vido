// 日志系统 - 将调试信息记录到 ~/.vido/log 目录的物理文件中
// 格式规范：`[ts] [LEVEL] [Module] message | key=value`，见 docs/superpowers/specs/2026-08-01-logging-design.md

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

export const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
};

export const LOG_LEVEL: LogLevel =
  ((import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'INFO');

/** 纯函数：按级别阈值判断是否输出 */
export function shouldLog(level: LogLevel, threshold: LogLevel = LOG_LEVEL): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[threshold];
}

/** 纯函数：唯一日志格式来源。data 扁平化为 key=value，值 JSON.stringify 以可逆 */
export function formatLogEntry(level: LogLevel, module: string, message: string, data?: any): string {
  const ts = new Date().toISOString();
  let line = `${ts} [${level}] [${module}] ${message}`;
  if (data !== undefined && data !== null) {
    const normalized = data instanceof Error ? { error: data.message } : data;
    const parts = Object.entries(normalized).map(([k, v]) => `${k}=${JSON.stringify(v)}`);
    if (parts.length > 0) line += ` | ${parts.join(' | ')}`;
  }
  return line;
}

interface QueueEntry {
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

class Logger {
  private logQueue: QueueEntry[] = [];
  private isWriting = false;
  private maxQueueSize = 500;

  private async writeToFile(entry: QueueEntry): Promise<void> {
    try {
      if (window.vidoLogger && window.vidoLogger.writeLog) {
        await window.vidoLogger.writeLog(entry);
      } else {
        console.warn('File logging not available, entry:', formatLogEntry(entry.level, entry.module, entry.message, entry.data));
      }
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  private async processLogQueue(): Promise<void> {
    if (this.isWriting || this.logQueue.length === 0) {
      return;
    }

    this.isWriting = true;

    try {
      while (this.logQueue.length > 0) {
        const logEntry = this.logQueue.shift();
        if (logEntry) {
          await this.writeToFile(logEntry);
        }
      }
    } finally {
      this.isWriting = false;
      // 写入期间可能有新日志入队，延迟再刷一次，防止日志滞留
      if (this.logQueue.length > 0) {
        setTimeout(() => this.processLogQueue(), 50);
      }
    }
  }

  private log(level: LogLevel, module: string, message: string, data?: any): void {
    if (!shouldLog(level)) return;
    const entry: QueueEntry = { level, module, message, data };

    // 输出到控制台
    const consoleMethod = level === 'ERROR' ? 'error' :
                         level === 'WARN' ? 'warn' :
                         level === 'DEBUG' ? 'debug' : 'log';
    console[consoleMethod](formatLogEntry(level, module, message, data));

    // 队列满时丢弃最旧的日志
    if (this.logQueue.length >= this.maxQueueSize) {
      this.logQueue.shift();
    }
    this.logQueue.push(entry);

    // 异步处理队列
    this.processLogQueue().catch(error => {
      console.error('Failed to process log queue:', error);
    });
  }

  info(module: string, message: string, data?: any): void {
    this.log('INFO', module, message, data);
  }

  warn(module: string, message: string, data?: any): void {
    this.log('WARN', module, message, data);
  }

  error(module: string, message: string, data?: any): void {
    this.log('ERROR', module, message, data);
  }

  debug(module: string, message: string, data?: any): void {
    this.log('DEBUG', module, message, data);
  }

  async flush(): Promise<void> {
    await this.processLogQueue();
  }
}

// 全局日志实例
export const logger = new Logger();

if (import.meta.env.DEV) {
  (window as any).debugLogger = logger;
}
