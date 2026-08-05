import { describe, expect, it, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import LastLine from '../LastLine.vue';
import { store } from '../../domain/state/store';
import { getCurrentDate } from '../../utils/date-formatter';

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

describe('LastLine — 输入框占位提示', () => {
  beforeEach(() => {
    if (store.state.lastlineVisible) store.transition('Escape');
  });

  it('命令模式显示命令占位（含 Tab 补全提示）', async () => {
    store.transition(':');
    const wrapper = mount(LastLine);
    await nextTick();
    expect(wrapper.find('input').attributes('placeholder')).toContain('Tab');
  });

  it('搜索模式显示搜索占位（无 Tab 提示）', async () => {
    store.transition('/');
    const wrapper = mount(LastLine);
    await nextTick();
    const placeholder = wrapper.find('input').attributes('placeholder') ?? '';
    expect(placeholder.length).toBeGreaterThan(0);
    expect(placeholder).not.toContain('Tab');
  });

  it('编辑态 placeholder 不残留（无 lastline 时无输入框）', async () => {
    const wrapper = mount(LastLine);
    await nextTick();
    expect(wrapper.find('input').exists()).toBe(false);
  });
});

describe('LastLine — 命令补全（灰色候选 + Tab 循环）', () => {
  beforeEach(() => {
    if (store.state.lastlineVisible) store.transition('Escape');
    clearHistory();
    store.transition(':');
  });

  it('输入 :sc 时灰色候选显示第一个匹配命令的剩余部分', async () => {
    store.updateLastlineContent(':sc');
    const wrapper = mount(LastLine);
    await nextTick();
    expect(wrapper.find('.ghost').exists()).toBe(true);
    expect(wrapper.find('.ghost').text()).toBe('hedule'); // schedule 的剩余
  });

  it('唯一匹配时灰色候选显示完整剩余', async () => {
    store.updateLastlineContent(':sch');
    const wrapper = mount(LastLine);
    await nextTick();
    expect(wrapper.find('.ghost').text()).toBe('edule');
  });

  it('无匹配或空输入时不显示灰色候选', async () => {
    const wrapper = mount(LastLine);
    await nextTick();
    expect(wrapper.find('.ghost').exists()).toBe(false);
    store.updateLastlineContent(':zzz');
    await nextTick();
    expect(wrapper.find('.ghost').exists()).toBe(false);
  });

  it('搜索模式不显示灰色候选', async () => {
    store.transition('Escape');
    store.transition('/');
    store.updateLastlineContent('/sc');
    const wrapper = mount(LastLine);
    await nextTick();
    expect(wrapper.find('.ghost').exists()).toBe(false);
  });

  it('Tab 补全为第一个候选，再按 Tab 循环下一个候选', async () => {
    store.updateLastlineContent(':s');
    const wrapper = mount(LastLine);
    await nextTick();
    const input = wrapper.find('input');

    await input.trigger('keydown', { key: 'Tab' });
    expect(store.state.lastlineContent).toBe(':schedule');

    await input.trigger('keydown', { key: 'Tab' });
    expect(store.state.lastlineContent).toBe(':sort');

    await input.trigger('keydown', { key: 'Tab' });
    expect(store.state.lastlineContent).toBe(':schedule'); // 循环回第一个
  });

  it('补全后键入新字符重置循环，回到首个候选', async () => {
    store.updateLastlineContent(':s');
    const wrapper = mount(LastLine);
    await nextTick();
    const input = wrapper.find('input');

    await input.trigger('keydown', { key: 'Tab' });
    expect(store.state.lastlineContent).toBe(':schedule');

    // 键入字符（触发 @input）重置会话
    await input.setValue('sort');
    await input.trigger('input');
    await input.trigger('keydown', { key: 'Tab' });
    // 新输入 sort 唯一匹配自身
    expect(store.state.lastlineContent).toBe(':sort');
  });

  it('完整输入唯一命令时 Tab 无副作用', async () => {
    store.updateLastlineContent(':theme');
    const wrapper = mount(LastLine);
    await nextTick();
    const input = wrapper.find('input');
    await input.trigger('keydown', { key: 'Tab' });
    expect(store.state.lastlineContent).toBe(':theme');
  });
});

describe('LastLine — schedule 参数补全（关键字/日期/时间）', () => {
  beforeEach(() => {
    if (store.state.lastlineVisible) store.transition('Escape');
    clearHistory();
    store.transition(':');
  });

  it('空格后灰色候选显示第一个参数关键字 today', async () => {
    store.updateLastlineContent(':schedule ');
    const wrapper = mount(LastLine);
    await nextTick();
    expect(wrapper.find('.ghost').exists()).toBe(true);
    expect(wrapper.find('.ghost').text()).toBe('today');
  });

  it('参数前缀匹配显示剩余（tom → orrow）', async () => {
    store.updateLastlineContent(':schedule tom');
    const wrapper = mount(LastLine);
    await nextTick();
    expect(wrapper.find('.ghost').text()).toBe('orrow');
  });

  it('Tab 在参数关键字间循环（today → tomorrow → next week → monday…）', async () => {
    store.updateLastlineContent(':schedule ');
    const wrapper = mount(LastLine);
    await nextTick();
    const input = wrapper.find('input');

    await input.trigger('keydown', { key: 'Tab' });
    expect(store.state.lastlineContent).toBe(':schedule today');

    await input.trigger('keydown', { key: 'Tab' });
    expect(store.state.lastlineContent).toBe(':schedule tomorrow');

    await input.trigger('keydown', { key: 'Tab' });
    expect(store.state.lastlineContent).toBe(':schedule next week');

    await input.trigger('keydown', { key: 'Tab' });
    expect(store.state.lastlineContent).toBe(':schedule monday');

    // 完整循环 13 个关键字后回到 today
    for (let i = 0; i < 9; i++) await input.trigger('keydown', { key: 'Tab' });
    expect(store.state.lastlineContent).toBe(':schedule today');
  });

  it('数字输入时灰色候选补全为今天日期（提醒日期格式）', async () => {
    const today = getCurrentDate(); // 动态：2026-08-05 等
    store.updateLastlineContent(`:schedule ${today.slice(0, 7)}`); // YYYY-MM
    const wrapper = mount(LastLine);
    await nextTick();
    expect(wrapper.find('.ghost').exists()).toBe(true);
    expect(wrapper.find('.ghost').text()).toBe(today.slice(7)); // -DD
  });

  it('完整日期后灰色候选消失，按空格出现默认时间 10:00', async () => {
    store.updateLastlineContent(':schedule 2025-08-01');
    const wrapper = mount(LastLine);
    await nextTick();
    expect(wrapper.find('.ghost').exists()).toBe(false);

    store.updateLastlineContent(':schedule 2025-08-01 ');
    await nextTick();
    expect(wrapper.find('.ghost').exists()).toBe(true);
    expect(wrapper.find('.ghost').text()).toBe('10:00');
  });

  it('时间前缀匹配默认时间（1 → 0:00），Tab 补全完整时间', async () => {
    store.updateLastlineContent(':schedule 2025-08-01 1');
    const wrapper = mount(LastLine);
    await nextTick();
    expect(wrapper.find('.ghost').text()).toBe('0:00');

    await wrapper.find('input').trigger('keydown', { key: 'Tab' });
    expect(store.state.lastlineContent).toBe(':schedule 2025-08-01 10:00');
  });

  it('every 后空格灰色候选显示 monday，Tab 补全 every monday', async () => {
    store.updateLastlineContent(':schedule every ');
    const wrapper = mount(LastLine);
    await nextTick();
    expect(wrapper.find('.ghost').text()).toBe('monday');

    await wrapper.find('input').trigger('keydown', { key: 'Tab' });
    expect(store.state.lastlineContent).toBe(':schedule every monday');
  });

  it('完整关键字输入时无候选（正好符合预期，直接 Enter）', async () => {
    store.updateLastlineContent(':schedule tomorrow');
    const wrapper = mount(LastLine);
    await nextTick();
    expect(wrapper.find('.ghost').exists()).toBe(false);
  });

  it('非 schedule 命令无参数补全', async () => {
    store.updateLastlineContent(':sort ');
    const wrapper = mount(LastLine);
    await nextTick();
    expect(wrapper.find('.ghost').exists()).toBe(false);
  });
});
