/**
 * 主进程 Logger 实现
 * 直接写入磁盘文件
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// 主进程logger实现 - 直接写入文件
export const logger = {
  info: (module: string, message: string, data?: any) => {
    const logEntry = `[INFO] [${module}] ${message}${data ? ` | Data: ${JSON.stringify(data)}` : ''}`;
    writeLogToFile(logEntry);
  },
  warn: (module: string, message: string, data?: any) => {
    const logEntry = `[WARN] [${module}] ${message}${data ? ` | Data: ${JSON.stringify(data)}` : ''}`;
    writeLogToFile(logEntry);
  },
  error: (module: string, message: string, data?: any) => {
    const logEntry = `[ERROR] [${module}] ${message}${data ? ` | Data: ${JSON.stringify(data)}` : ''}`;
    writeLogToFile(logEntry);
  },
  debug: (module: string, message: string, data?: any) => {
    const logEntry = `[DEBUG] [${module}] ${message}${data ? ` | Data: ${JSON.stringify(data)}` : ''}`;
    writeLogToFile(logEntry);
  },
};

// 直接写入日志文件
export function writeLogToFile(logEntry: string) {
  try {
    const logDir = path.join(os.homedir(), '.vido', 'log');

    // 确保日志目录存在
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // 生成日志文件名（按日期）
    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    const logFile = path.join(logDir, `vido-${dateString}.log`);

    // 格式化日志条目 - 添加时间戳
    const timestamp = now.toISOString();
    const formattedEntry = `${timestamp} ${logEntry}\n`;

    // 写入日志文件
    fs.appendFileSync(logFile, formattedEntry);
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}
