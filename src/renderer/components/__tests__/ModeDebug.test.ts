import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import ModeDebug from '../ModeDebug.vue';
import { store } from '../../domain/state/store';
import { formatDate } from '../../utils/date-formatter';

describe('ModeDebug — 日历状态栏实时焦点日期', () => {
  it('打开日历：徽标 CALENDAR、状态栏立即显示焦点日期；j/l 移动时跟随更新', async () => {
    store.closeCalendarView();
    store.openCalendarView();
    const wrapper = mount(ModeDebug);
    await nextTick();
    const today = formatDate(new Date());

    expect(wrapper.find('.mode-indicator').text()).toBe('CALENDAR');
    expect(wrapper.find('.status-center').text()).toContain(today);

    store.moveCalendarDirection('right'); // 焦点 +1 天
    await nextTick();
    const d = new Date();
    d.setDate(d.getDate() + 1);
    expect(wrapper.find('.status-center').text()).toContain(formatDate(d));

    store.closeCalendarView();
    await nextTick();
    expect(wrapper.find('.mode-indicator').text()).toBe('NORMAL');
  });
});
