// 日志系统 - 将调试信息记录到 ~/.vido/log 目录的物理文件中

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  module: string;
  message: string;
  data?: any;
}

class Logger {
  private logQueue: string[] = [];
  private isWriting = false;
  private maxQueueSize = 500;

  private formatLogEntry(level: LogEntry['level'], module: string, message: string, data?: any): string {
    const ts = new Date().toISOString();
    let logLine = `${ts} [${level}] [${module}] ${message}`;

    if (data) {
      try {
        const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
        logLine += ` | Data: ${dataStr}`;
      } catch {
        logLine += ` | Data: [circular object]`;
      }
    }

    return logLine;
  }

  private async writeToFile(logEntry: string): Promise<void> {
    try {
      if (window.vidoLogger && window.vidoLogger.writeLog) {
        await window.vidoLogger.writeLog(logEntry);
      } else {
        console.warn('File logging not available, entry:', logEntry);
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

  private log(level: LogEntry['level'], module: string, message: string, data?: any): void {
    const logEntry = this.formatLogEntry(level, module, message, data);

    // 输出到控制台
    const consoleMethod = level === 'ERROR' ? 'error' :
                         level === 'WARN' ? 'warn' :
                         level === 'DEBUG' ? 'debug' : 'log';
    console[consoleMethod](`[${new Date().toISOString()}] ${logEntry}`);

    // 队列满时丢弃最旧的日志
    if (this.logQueue.length >= this.maxQueueSize) {
      this.logQueue.shift();
    }
    this.logQueue.push(logEntry);

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
