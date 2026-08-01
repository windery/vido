// @vitest-environment node
import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { formatLogEntry, shouldLog, getLogFilePath } from '../logger';

const today = new Date().toISOString().split('T')[0];

describe('主进程 formatLogEntry 纯函数（与渲染进程同构）', () => {
  it('无 data 时输出 `[ts] [LEVEL] [Module] message`', () => {
    const line = formatLogEntry('INFO', 'Store', 'save');
    expect(line).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[INFO\] \[Store\] save$/);
  });

  it('有 data 时扁平化为 key=value，值 JSON.stringify', () => {
    const line = formatLogEntry('ERROR', 'Persistence', 'save failed', { file: 'tasks.json', count: 3 });
    expect(line).toContain(' | file="tasks.json" | count=3');
  });

  it('Error 对象归一化为 error 字段', () => {
    const line = formatLogEntry('ERROR', 'MainProcess', 'init failed', new Error('boom'));
    expect(line).toContain('error="boom"');
  });
});

describe('主进程 shouldLog 纯函数', () => {
  it('INFO 阈值过滤 DEBUG', () => {
    expect(shouldLog('DEBUG', 'INFO')).toBe(false);
    expect(shouldLog('INFO', 'INFO')).toBe(true);
    expect(shouldLog('ERROR', 'INFO')).toBe(true);
  });
});

describe('getLogFilePath', () => {
  it('返回 ~/.vido/log/vido-YYYY-MM-DD.log', () => {
    expect(getLogFilePath()).toBe(path.join(os.homedir(), '.vido', 'log', `vido-${today}.log`));
  });
});
