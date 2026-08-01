/**
 * 主进程 Logger 实现
 * 直接写入磁盘文件；格式与渲染进程保持一致（见 docs/superpowers/specs/2026-08-01-logging-design.md）
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

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
  ((process.env.VIDO_LOG_LEVEL as LogLevel) || 'INFO');

/** 纯函数：按级别阈值判断是否输出（与渲染进程同构） */
export function shouldLog(level: LogLevel, threshold: LogLevel = LOG_LEVEL): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[threshold];
}

/** 纯函数：唯一日志格式来源（与渲染进程同构） */
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

/** 当日日志文件路径：~/.vido/log/vido-YYYY-MM-DD.log */
export function getLogFilePath(): string {
  const dateString = new Date().toISOString().split('T')[0];
  return path.join(os.homedir(), '.vido', 'log', `vido-${dateString}.log`);
}

/** 写入日志文件。接受结构化 entry 或（兼容）已格式化字符串 */
export function writeLogToFile(entry: LogEntry | string): void {
  try {
    if (typeof entry === 'string') {
      fs.appendFileSync(getLogFilePath(), `${new Date().toISOString()} ${entry}\n`);
      return;
    }
    if (!shouldLog(entry.level)) return;

    const logDir = path.join(os.homedir(), '.vido', 'log');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    fs.appendFileSync(getLogFilePath(), `${formatLogEntry(entry.level, entry.module, entry.message, entry.data)}\n`);
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

// 主进程 logger 对象 - 接收结构化参数
export const logger = {
  info: (module: string, message: string, data?: any) => {
    writeLogToFile({ level: 'INFO', module, message, data });
  },
  warn: (module: string, message: string, data?: any) => {
    writeLogToFile({ level: 'WARN', module, message, data });
  },
  error: (module: string, message: string, data?: any) => {
    writeLogToFile({ level: 'ERROR', module, message, data });
  },
  debug: (module: string, message: string, data?: any) => {
    writeLogToFile({ level: 'DEBUG', module, message, data });
  },
};
