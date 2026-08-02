import { describe, expect, it, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import VimHeader from '../VimHeader.vue';
import { setTheme, setLang } from '../../domain/state/prefs';

describe('VimHeader', () => {
  beforeEach(() => {
    localStorage.clear();
    setTheme('dark');
    setLang('zh');
  });

  it('renders localized stats in Chinese', () => {
    const wrapper = mount(VimHeader, {
      props: { filteredTasksCount: 3, completedTasksCount: 1 },
    });
    expect(wrapper.text()).toContain('Vido - Vim 任务管理器');
    expect(wrapper.text()).toContain('3 个任务');
    expect(wrapper.text()).toContain('已完成 1/3');
  });

  it('renders English after lang switch', async () => {
    const wrapper = mount(VimHeader, {
      props: { filteredTasksCount: 3, completedTasksCount: 1 },
    });
    setLang('en');
    await nextTick();
    expect(wrapper.text()).toContain('Vido - Vim Todo Manager');
    expect(wrapper.text()).toContain('3 tasks');
    expect(wrapper.text()).toContain('1/3 done');
  });

  it('renders no mouse controls (keyboard-only)', () => {
    const wrapper = mount(VimHeader, {
      props: { filteredTasksCount: 0, completedTasksCount: 0 },
    });
    // 纯键盘：header 不含任何按钮，主题/语言切换走 T/L 键或 :theme/:lang 命令
    expect(wrapper.findAll('button').length).toBe(0);
    expect(wrapper.text()).not.toContain('切换主题');
    expect(wrapper.text()).not.toContain('切换语言');
  });
});
