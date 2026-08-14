import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CalendarView from '../CalendarView.vue';
import { formatDate } from '../../utils/date-formatter';

const baseProps = {
  tasks: [],
  granularity: 'month' as const,
  anchor: '2026-05-08',
  selectedDate: '2026-05-08',
  selectedTaskId: undefined,
  dayDetail: false,
};

describe('CalendarView — 仅当月天数网格（上/下月不占格）', () => {
  it('month 视图只渲染当月天数（2026-05 有 31 格），无邻月格', () => {
    const wrapper = mount(CalendarView, { props: baseProps });
    const cells = wrapper.findAll('.cal-cell');
    expect(cells.length).toBe(31);
    expect(cells.every((c) => c.text().includes('-'))).toBe(false);
  });

  it('1 号对齐其星期列（2026-05-01 是周五 → 第 6 列）', () => {
    const wrapper = mount(CalendarView, { props: baseProps });
    const cells = wrapper.findAll('.cal-cell');
    expect((cells[0].element as HTMLElement).style.gridColumnStart).toBe('6');
  });

  it('2 月（非闰年 28 天）：只渲染 28 格', () => {
    const wrapper = mount(CalendarView, {
      props: { ...baseProps, anchor: '2026-02-10', selectedDate: '2026-02-10' },
    });
    expect(wrapper.findAll('.cal-cell').length).toBe(28);
  });

  it('week 视图：7 列日计划表（每周 7 格，无置灰月格）', () => {
    const wrapper = mount(CalendarView, {
      props: { ...baseProps, granularity: 'week', anchor: '2026-05-08', selectedDate: '2026-05-08' },
    });
    const cells = wrapper.findAll('.cal-cell');
    expect(cells.length).toBe(7);
    expect(cells.filter((c) => c.classes().includes('is-out')).length).toBe(0);
    expect(cells.filter((c) => c.classes().includes('is-week')).length).toBe(0);
    // 选中列有焦点框
    expect(cells.filter((c) => c.classes().includes('is-focused')).length).toBe(1);
  });

  it('week 跨月：列头各标自己月份（8/30、31、9/1…），活跃周 7 格完整', () => {
    // 活跃周 08-30..09-05（anchor 周日 08-30）
    const wrapper = mount(CalendarView, {
      props: { ...baseProps, granularity: 'week', anchor: '2026-08-30', selectedDate: '2026-08-30' },
    });
    const cells = wrapper.findAll('.cal-cell');
    expect(cells.length).toBe(7);
    const heads = wrapper.findAll('.cal-cell-head');
    expect(heads[0].text()).toContain('8/30'); // 周日 8/30
    expect(heads[1].text()).toContain('31'); // 周一 8/31（同月不带前缀）
    expect(heads[2].text()).toContain('9/1'); // 周二 9/1（跨月带月前缀）
    expect(heads[6].text()).toContain('5'); // 周六 9/5
  });

  it('day 视图走详情分支，不渲染网格', () => {
    const wrapper = mount(CalendarView, {
      props: { ...baseProps, granularity: 'day' },
    });
    expect(wrapper.findAll('.cal-cell').length).toBe(1); // cal-single 单格
    expect(wrapper.find('.cal-grid').exists()).toBe(false);
  });

  it('今天标记 is-today（不再用高亮边框，与选中日焦点区分）', () => {
    const today = formatDate(new Date());
    const wrapper = mount(CalendarView, {
      props: { ...baseProps, anchor: today, selectedDate: today },
    });
    const todayCell = wrapper.findAll('.cal-cell').find((c) => c.classes().includes('is-today'));
    expect(todayCell).toBeTruthy();
    // 今天 ≠ 选中焦点：两个状态独立（样式上今天无边框、焦点有边框）
    const focused = wrapper.findAll('.cal-cell').find((c) => c.classes().includes('is-focused'));
    expect(focused).toBeTruthy();
  });

  it('头部不常驻快捷键提示（按 ? 查询，与配置面板一致）', () => {
    const wrapper = mount(CalendarView, { props: baseProps });
    expect(wrapper.find('.cal-hint').exists()).toBe(false);
  });
});
