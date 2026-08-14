import { describe, expect, it, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import VimHeader from '../VimHeader.vue';
import { setTheme } from '../../domain/state/prefs';

describe('VimHeader', () => {
  beforeEach(() => {
    localStorage.clear();
    setTheme('dark');
  });

  it('renders English stats', () => {
    const wrapper = mount(VimHeader, {
      props: { filteredTasksCount: 3, completedTasksCount: 1 },
    });
    expect(wrapper.text()).toContain('vido'); // logo 品牌
    expect(wrapper.text()).toContain('1/3'); // 完成进度 done/total（与状态栏的可见/全部计数分工，不重复）
    expect(wrapper.text()).toContain('done');
  });

  it('renders no mouse controls (keyboard-only)', () => {
    const wrapper = mount(VimHeader, {
      props: { filteredTasksCount: 0, completedTasksCount: 0 },
    });
    // 纯键盘：header 不含任何按钮，主题切换走 T 键或 :theme 命令
    expect(wrapper.findAll('button').length).toBe(0);
    expect(wrapper.text()).not.toContain('Toggle theme');
  });
});
