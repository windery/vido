import { describe, it, expect } from 'vitest';
import { computeNavSelection } from '../cursor';

describe('computeNavSelection — 内容导航块光标选区（对齐 vido.html applyCursorUI）', () => {
  it('光标在行中：选中当前字符 [col, col+1]', () => {
    expect(computeNavSelection(0, 0, 'hello')).toEqual([0, 1]);
    expect(computeNavSelection(0, 2, 'hello')).toEqual([2, 3]);
  });

  it('光标在行尾：选中行尾字符 [len-1, len]', () => {
    expect(computeNavSelection(0, 5, 'hello')).toEqual([4, 5]);
  });

  it('空行：折叠光标 [offset, offset]', () => {
    expect(computeNavSelection(0, 0, '')).toEqual([0, 0]);
    expect(computeNavSelection(7, 0, '')).toEqual([7, 7]);
  });

  it('多行：offset 累加换行偏移后正确选中', () => {
    // content = 'line1\nline2'，第二行行首 offset = 6
    expect(computeNavSelection(6, 0, 'line2')).toEqual([6, 7]);
    expect(computeNavSelection(6, 4, 'line2')).toEqual([10, 11]); // col=4 选中字符 '2'
    expect(computeNavSelection(6, 5, 'line2')).toEqual([10, 11]); // 行尾 col=5 >= len → 选中行尾字符
  });
});
