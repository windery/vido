import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import ModeDebug from '../ModeDebug.vue';
import { store } from '../../domain/state/store';

describe('ModeDebug — 日历状态栏', () => {
  it('打开日历：徽标 CALENDAR、中央显示主要按键（? help 收尾）；年月由日历头部展示，状态栏不重复提示日期', async () => {
    store.closeCalendarView();
    store.openCalendarView();
    const wrapper = mount(ModeDebug);
    await nextTick();

    expect(wrapper.find('.mode-indicator').text()).toBe('CALENDAR');
    // 中央：主要按键提示（与 schedule config 同风格），以 ? help 收尾
    expect(wrapper.find('.status-center').text()).toContain('jkhl move');
    expect(wrapper.find('.status-center').text()).toContain('? help');
    // 右侧：日历视图不显示日期（年月在日历头部正中）
    expect(wrapper.find('.pos').exists()).toBe(false);

    store.closeCalendarView();
    await nextTick();
    expect(wrapper.find('.mode-indicator').text()).toBe('NORMAL');
  });
});
