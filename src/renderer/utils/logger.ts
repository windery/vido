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

  private formatLogEntry(level: LogEntry['level'], module: string, message: string, data?: any): string {
    let logLine = `[${level}] [${module}] ${message}`;
    
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
        // 如果Electron API不可用，回退到控制台
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
    }
  }

  private log(level: LogEntry['level'], module: string, message: string, data?: any): void {
    const logEntry = this.formatLogEntry(level, module, message, data);
    
    // 输出到控制台
    const consoleMethod = level === 'ERROR' ? 'error' : 
                         level === 'WARN' ? 'warn' : 
                         level === 'DEBUG' ? 'debug' : 'log';
    console[consoleMethod](`[${new Date().toISOString()}] ${logEntry}`);

    // 添加到写入队列
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

  // 强制写入所有待处理的日志
  async flush(): Promise<void> {
    await this.processLogQueue();
  }
}

// 全局日志实例
export const logger = new Logger();

// 在开发环境下，将logger暴露到window对象，方便在控制台调试
if (import.meta.env.DEV) {
  (window as any).debugLogger = logger;
  logger.info('LOGGER', 'File-based logger initialized. Logs saved to ~/.vido/log/');
}