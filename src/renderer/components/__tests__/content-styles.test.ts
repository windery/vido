/**
 * 内容区三态（normal markdown / content-nav / content-edit）高度一致性契约测试。
 *
 * 背景：normal 模式用 markdown 渲染（v-html），nav/edit 用 textarea。
 * 任何渲染差异（字体、行高、段落 margin、滚动条占宽、max-height）都会导致
 * 切换模式时内容区高度跳动。本测试锁定关键 CSS 规则，防止回归。
 *
 * jsdom 不计算真实布局，因此直接断言 <style> 源码中的规则（静态契约）。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, '../TaskContent.vue'), 'utf-8');
const style = source.split('<style scoped>')[1].split('</style>')[0];

/** 提取某个规则块（从选择器到下一个 `}`） */
function rule(selector: string): string {
  const m = style.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`样式规则未找到: ${selector}`);
  return m[1];
}

const MONO_FONT = "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace";

describe('content 三态高度一致性契约', () => {
  it('normal 模式（.markdown-display）与编辑器（.editor-shell）使用同一等宽字体', () => {
    expect(rule('\\.editor-shell')).toContain(MONO_FONT);
    expect(rule('\\.markdown-display')).toContain(MONO_FONT);
  });

  it('两态字号一致（13px），行高一致（整数 22px，textarea 行高向上取整须与 markdown 对齐）', () => {
    expect(rule('\\.editor-shell')).toContain('font-size: 13px');
    expect(rule('\\.editor-shell')).toContain('line-height: 22px');
    expect(rule('\\.markdown-display')).toContain('font-size: 13px');
    expect(rule('\\.markdown-display')).toContain('line-height: 22px');
  });

  it('textarea 继承 shell 的字体/字号/行高（无独立值造成偏差）', () => {
    const editor = rule('\\.content-editor');
    expect(editor).toContain('font-family: inherit');
    expect(editor).toContain('font-size: inherit');
    expect(editor).toContain('line-height: inherit');
  });

  it('textarea rows="1" 消除固有最小 2 行高度（1 行内容与 markdown 对齐）', () => {
    expect(source).toContain('rows="1"');
    expect(rule('\\.content-editor')).not.toContain('min-height');
  });

  it('单段纯文本零 margin（marked 会把文本包成单个 <p>，上下 margin 曾导致 normal 高 12px）', () => {
    expect(rule('\\.markdown-display :deep\\(p\\)')).toContain('margin: 0');
  });

  it('段落间距仅在相邻段落间（p + p margin-top: 6px）', () => {
    expect(rule('\\.markdown-display :deep\\(p \\+ p\\)')).toContain('margin-top: 6px');
  });

  it('内容高度无上限（完整展示，不截断滚动）：两态均无 max-height 限制', () => {
    expect(rule('\\.content-editor')).not.toMatch(/max-height/);
    expect(rule('\\.markdown-display')).not.toMatch(/max-height/);
    expect(rule('\\.task-content-area')).not.toMatch(/max-height/);
  });

  it('textare 高度由内容撑开（height: auto + adjustHeight），编辑态不出现滚动条', () => {
    expect(rule('\\.content-editor')).toContain('height: auto');
    expect(rule('\\.content-editor')).toContain('overflow-y: hidden');
  });

  it('markdown 换行规则与 textarea 一致（pre-wrap + break-word）', () => {
    expect(rule('\\.markdown-display')).toContain('white-space: pre-wrap');
    expect(rule('\\.markdown-display')).toContain('word-wrap: break-word');
    expect(rule('\\.markdown-display')).toContain('overflow-wrap: break-word');
  });
});
