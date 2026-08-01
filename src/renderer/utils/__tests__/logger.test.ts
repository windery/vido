import { describe, it, expect } from 'vitest';
import { formatLogEntry, shouldLog } from '../logger';

describe('formatLogEntry 纯函数', () => {
  it('无 data 时输出 `[ts] [LEVEL] [Module] message`', () => {
    const line = formatLogEntry('INFO', 'Store', 'create task');
    expect(line).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[INFO\] \[Store\] create task$/
    );
  });

  it('有 data 时扁平化为 key=value，值 JSON.stringify', () => {
    const line = formatLogEntry('INFO', 'Store', 'create task', {
      id: 5,
      title: '买牛奶',
      selected: true,
    });
    expect(line).toMatch(
      /\[INFO\] \[Store\] create task \| id=5 \| title="买牛奶" \| selected=true$/
    );
  });

  it('多字段 data 用 ` | ` 拼接', () => {
    const line = formatLogEntry('WARN', 'Store', 'update task', {
      id: 1,
      field: 'priority',
      value: 'high',
    });
    expect(line).toContain(
      ' | id=1 | field="priority" | value="high"'
    );
  });

  it('特殊字符值（含引号与 |）安全转义', () => {
    const line = formatLogEntry('INFO', 'Store', 'update task', {
      id: 1,
      value: 'say "hi" | bye',
    });
    expect(line).toContain('value="say \\"hi\\" | bye"');
  });

  it('空对象 data 不输出 ` | ` 后缀', () => {
    const line = formatLogEntry('INFO', 'Store', 'clear search', {});
    expect(line).toMatch(/\[INFO\] \[Store\] clear search$/);
  });
});

describe('shouldLog 纯函数', () => {
  it('INFO 阈值下过滤 DEBUG，保留 INFO 及以上', () => {
    expect(shouldLog('DEBUG', 'INFO')).toBe(false);
    expect(shouldLog('INFO', 'INFO')).toBe(true);
    expect(shouldLog('WARN', 'INFO')).toBe(true);
    expect(shouldLog('ERROR', 'INFO')).toBe(true);
  });

  it('ERROR 阈值下只输出 ERROR', () => {
    expect(shouldLog('DEBUG', 'ERROR')).toBe(false);
    expect(shouldLog('INFO', 'ERROR')).toBe(false);
    expect(shouldLog('WARN', 'ERROR')).toBe(false);
    expect(shouldLog('ERROR', 'ERROR')).toBe(true);
  });

  it('DEBUG 阈值下全部输出', () => {
    expect(shouldLog('DEBUG', 'DEBUG')).toBe(true);
    expect(shouldLog('ERROR', 'DEBUG')).toBe(true);
  });
});
