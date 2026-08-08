import { describe, it, expect } from 'vitest';
import { Task } from '../../domain/task';
import { ScheduleRepeat } from '../../domain/schedule';
import {
  scheduleDate,
  repeatDates,
  getCalendarRange,
  collectTasksInRange,
  weekdayName,
} from '../calendar';

function mk(id: number, date: string, repeat?: ScheduleRepeat): Task {
  const t = new Task(id);
  t.title = `T${id}`;
  // 直接构造 quick schedule
  t.schedule = {
    type: 'quick',
    quickTime: { date },
    repeat,
  } as any;
  return t;
}

const MON = '2026-05-04';
const SUN = '2026-05-10';

describe('calendar 分组纯函数', () => {
  it('scheduleDate 提取主日期', () => {
    expect(scheduleDate(mk(1, '2026-05-08'))).toBe('2026-05-08');
    const t = new Task(2);
    t.title = 'x';
    expect(scheduleDate(t)).toBeNull();
  });

  it('repeatDates：daily 范围内每天出现', () => {
    const ds = repeatDates('2026-05-08', 'daily', '2026-05-04', '2026-05-10');
    expect(ds.length).toBe(7); // 5-04..5-10 除 5-08 外 6 个 + 主日期
    expect(ds).toContain('2026-05-04');
    expect(ds).toContain('2026-05-10');
  });

  it('repeatDates：weekly 同周几出现', () => {
    const ds = repeatDates('2026-05-08', 'weekly', '2026-05-01', '2026-05-31');
    expect(ds).toContain('2026-05-08'); // 主日期
    expect(ds).toContain('2026-05-15');
    expect(ds).toContain('2026-05-01'); // 同周五
    expect(ds).not.toContain('2026-05-09'); // 周六
  });

  it('repeatDates：monthly 每月同日出现', () => {
    const ds = repeatDates('2026-05-08', 'monthly', '2026-04-01', '2026-06-30');
    expect(ds).toContain('2026-04-08');
    expect(ds).toContain('2026-05-08');
    expect(ds).toContain('2026-06-08');
    expect(ds).not.toContain('2026-06-09');
  });

  it('repeatDates：yearly 每年同日出现', () => {
    const ds = repeatDates('2026-05-08', 'yearly', '2025-01-01', '2027-12-31');
    expect(ds).toContain('2025-05-08');
    expect(ds).toContain('2026-05-08');
    expect(ds).toContain('2027-05-08');
    expect(ds).not.toContain('2026-05-09');
  });

  it('getCalendarRange：day / week / month', () => {
    expect(getCalendarRange('day', '2026-05-08').label).toBe('2026-05-08');
    const week = getCalendarRange('week', '2026-05-08'); // 周五
    expect(week.label).toContain('2026-05-03'); // 周日开始
    expect(week.label).toContain('2026-05-09'); // 周六结束
    expect(getCalendarRange('month', '2026-05-08').label).toBe('May 2026');
  });

  it('collectTasksInRange：周视图按日期分组（含 repeat 展开）', () => {
    const tasks = [
      mk(1, '2026-05-06'),           // 周三
      mk(2, '2026-05-08'),           // 周五
      mk(3, '2026-05-08', 'daily'),  // 每天 → 整周出现
      mk(4, '2026-06-01'),           // 范围外
    ];
    const days = collectTasksInRange(tasks, 'week', '2026-05-08');
    expect(days.length).toBe(7); // 5-03..5-09，daily 任务每天在
    const wed = days.find((d) => d.date === '2026-05-06')!;
    expect(wed.tasks.map((t) => t.id)).toContain(1);
    expect(wed.tasks.map((t) => t.id)).toContain(3); // daily 展开
    const fri = days.find((d) => d.date === '2026-05-08')!;
    expect(fri.tasks.map((t) => t.id).sort()).toEqual([2, 3]);
  });

  it('weekdayName', () => {
    expect(weekdayName(MON)).toBe('Mon');
    expect(weekdayName(SUN)).toBe('Sun');
  });
});
