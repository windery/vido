import { describe, expect, it } from 'vitest';
import { parseSimulatedKey } from '../test-client';

describe('parseSimulatedKey — 模拟按键解析', () => {
  it('普通键原样返回，无修饰键', () => {
    expect(parseSimulatedKey('j')).toEqual({ key: 'j', ctrlKey: false });
    expect(parseSimulatedKey('Escape')).toEqual({ key: 'Escape', ctrlKey: false });
    expect(parseSimulatedKey('Enter')).toEqual({ key: 'Enter', ctrlKey: false });
  });

  it('Ctrl+/ctrl+/CONTROL+ 前缀解析为 ctrlKey 修饰', () => {
    expect(parseSimulatedKey('Ctrl+v')).toEqual({ key: 'v', ctrlKey: true });
    expect(parseSimulatedKey('ctrl+v')).toEqual({ key: 'v', ctrlKey: true });
    expect(parseSimulatedKey('CONTROL+V')).toEqual({ key: 'V', ctrlKey: true });
    expect(parseSimulatedKey('control+r')).toEqual({ key: 'r', ctrlKey: true });
  });

  it('无前缀时不误判含 ctrl 字样按键', () => {
    expect(parseSimulatedKey('ctrl')).toEqual({ key: 'ctrl', ctrlKey: false });
    expect(parseSimulatedKey('Ctrl')).toEqual({ key: 'Ctrl', ctrlKey: false });
  });
});
