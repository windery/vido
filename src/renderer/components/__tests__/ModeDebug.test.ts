import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import ModeDebug from '../ModeDebug.vue';
import { store } from '../../domain/state/store';
import { formatDate } from '../../utils/date-formatter';

describe('ModeDebug — 日历状态栏', () => {
  it('打开日历：徽标 CALENDAR、中央显示主要按键（? help 收尾）、右侧实时焦点日期', async () => {
    store.closeCalendarView();
    store.openCalendarView();
    const wrapper = mount(ModeDebug);
    await nextTick();
    const today = formatDate(new Date());

    expect(wrapper.find('.mode-indicator').text()).toBe('CALENDAR');
    // 中央：主要按键提示（与 schedule config 同风格），以 ? help 收尾
    expect(wrapper.find('.status-center').text()).toContain('jkhl move');
    expect(wrapper.find('.status-center').text()).toContain('? help');
    // 右侧：焦点日期（j/l 移动时跟随更新）
    expect(wrapper.find('.pos').text()).toContain(today);

    store.moveCalendarDirection('right'); // 焦点 +1 天
    await nextTick();
    const d = new Date();
    d.setDate(d.getDate() + 1);
    expect(wrapper.find('.pos').text()).toContain(formatDate(d));

    store.closeCalendarView();
    await nextTick();
    expect(wrapper.find('.mode-indicator').text()).toBe('NORMAL');
  });
});
