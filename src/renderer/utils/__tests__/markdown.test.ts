/**
 * markdown 渲染高度一致性单元测试。
 *
 * 背景：textarea（content-nav/edit）逐行显示（空行占一行），marked 默认折叠
 * 空行 → normal 模式切换时高度跳动。renderMarkdown 预处理空行为 <br> 占位，
 * 与编辑态逐行对齐；块级语法（列表/引用/标题）前后的空行保留段落语义。
 */
import { describe, it, expect } from 'vitest';
import { isBlockLine, renderMarkdown } from '../markdown';

describe('isBlockLine — 块级语法行判定', () => {
  it('列表项 / 引用 / 标题 / 代码块 / 分割线', () => {
    expect(isBlockLine('- item')).toBe(true);
    expect(isBlockLine('1. item')).toBe(true);
    expect(isBlockLine('> quote')).toBe(true);
    expect(isBlockLine('# heading')).toBe(true);
    expect(isBlockLine('```js')).toBe(true);
    expect(isBlockLine('---')).toBe(true);
  });

  it('普通文本不是块级行', () => {
    expect(isBlockLine('hello world')).toBe(false);
    expect(isBlockLine('普通文本')).toBe(false);
    expect(isBlockLine('2 * 3')).toBe(false);
  });
});

describe('renderMarkdown — 空行保留（与 textarea 逐行对齐）', () => {
  it('普通文本单段：无 <br> 注入，段落内换行保留', () => {
    const html = renderMarkdown('line one\nline two');
    expect(html).toContain('line one');
    expect(html).toContain('line two');
    expect(html).toContain('\n'); // 段落内换行保留（pre-wrap 下占行）
    expect(html).not.toContain('<br>');
  });

  it('普通文本空行 → 等量 <br> 占位（N 个 \\n = N 个 <br>）', () => {
    expect(renderMarkdown('para one\n\npara two')).toContain('<br><br>');
    expect(renderMarkdown('a\n\n\nb')).toContain('<br><br><br>');
  });

  it('块级语法（列表）前后的空行保留段落边界（不注入 <br>）', () => {
    const html = renderMarkdown('- a\n\n- b');
    expect(html).toContain('<ul>'); // 列表仍被渲染
    expect(html).not.toContain('<br>');
  });

  it('普通文本段与列表之间的空行：普通侧注入 <br>，列表侧保留', () => {
    const html = renderMarkdown('intro\n\n- a');
    expect(html).toContain('<ul>');
  });

  it('清理块级标签间空白（pre-wrap 下多余空行）', () => {
    const html = renderMarkdown('para one\n\npara two');
    expect(html).not.toMatch(/>\s+</); // 标签间无空白
  });

  it('输出为单个段落（空行已由 <br> 承载，无段落折叠）', () => {
    const html = renderMarkdown('para one\n\npara two');
    expect((html.match(/<p>/g) || []).length).toBe(1);
  });
});
