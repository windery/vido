import { describe, expect, it, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import LastLine from '../LastLine.vue';
import { store } from '../../domain/state/store';

/** 直接清空内部历史（测试隔离，避免跨用例累积） */
function clearHistory(): void {
  (store as unknown as { lastlineHistory: string[] }).lastlineHistory = [];
}

function openLastline(): void {
  store.transition(':');
}

describe('LastLine — 命令历史浏览', () => {
  beforeEach(() => {
    // 兜底：若残留在 LAST_LINE 先 Esc 关闭，再重新进入
    if (store.state.lastlineVisible) store.transition('Escape');
    clearHistory();
    openLastline();
    store.pushLastlineHistory(':p 1');
    store.pushLastlineHistory(':sort title');
  });

  it('↑ 逐条回看历史，↓ 逐条返回，回到草稿', async () => {
    const wrapper = mount(LastLine);
    await nextTick();
    const input = wrapper.find('input');

    await input.trigger('keydown', { key: 'ArrowUp' });
    expect(store.state.lastlineContent).toBe(':sort title');

    await input.trigger('keydown', { key: 'ArrowUp' });
    expect(store.state.lastlineContent).toBe(':p 1');

    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(store.state.lastlineContent).toBe(':sort title');

    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(store.state.lastlineContent).toBe(':');
  });

  it('输入草稿后按 ↑ 再按 ↓ 恢复草稿（不丢未提交输入）', async () => {
    const wrapper = mount(LastLine);
    await nextTick();
    const input = wrapper.find('input');

    store.updateLastlineContent(':new 买牛奶');
    await nextTick();

    await input.trigger('keydown', { key: 'ArrowUp' });
    expect(store.state.lastlineContent).toBe(':sort title');

    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(store.state.lastlineContent).toBe(':new 买牛奶');
  });

  it('无历史时 ↑/↓ 不改变输入', async () => {
    clearHistory();
    const wrapper = mount(LastLine);
    await nextTick();
    const input = wrapper.find('input');

    const before = store.state.lastlineContent;
    await input.trigger('keydown', { key: 'ArrowUp' });
    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(store.state.lastlineContent).toBe(before);
  });

  it('Esc 关闭后浏览态重置（下次打开回到草稿）', async () => {
    const wrapper = mount(LastLine);
    await nextTick();
    const input = wrapper.find('input');

    await input.trigger('keydown', { key: 'ArrowUp' });
    expect(store.state.lastlineContent).toBe(':sort title');

    await input.trigger('keydown', { key: 'Escape' });
    expect(store.state.lastlineVisible).toBe(false);

    openLastline();
    await nextTick();
    expect(store.state.lastlineContent).toBe(':');
  });
});
