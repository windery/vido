import { describe, it, expect } from 'vitest';
import {
  parseScheduleFromString,
  isScheduleExpired,
  migrateSchedule,
  createTodaySchedule,
  createTomorrowSchedule,
  createSpecificDateSchedule,
  createSpecificDateTimeSchedule,
  createWeekdaySchedule,
  getScheduleDisplay,
} from '../schedule-helper';
import { Schedule, ScheduleType, Weekday } from '../../domain/schedule';

describe('parseScheduleFromString', () => {
  it('parses "今天" as today', () => {
    const s = parseScheduleFromString('今天');
    expect(s).not.toBeNull();
    expect(s!.type).toBe(ScheduleType.QUICK);
    expect(s!.quickTime?.date).toBeTruthy();
  });

  it('parses "today" as today', () => {
    const s = parseScheduleFromString('today');
    expect(s!.type).toBe(ScheduleType.QUICK);
  });

  it('parses "明天" as tomorrow', () => {
    const s = parseScheduleFromString('明天');
    expect(s!.type).toBe(ScheduleType.QUICK);
    expect(s!.quickTime?.date).toBeTruthy();
  });

  it('parses "tomorrow" as tomorrow', () => {
    const s = parseScheduleFromString('tomorrow');
    expect(s!.type).toBe(ScheduleType.QUICK);
  });

  it('parses "周一" as weekday', () => {
    const s = parseScheduleFromString('周一');
    expect(s!.type).toBe(ScheduleType.WEEKLY);
    expect(s!.weeklyTime?.days).toEqual([Weekday.MONDAY]);
    expect(s!.weeklyTime?.recurring).toBe(false);
  });

  it('parses "mon" as weekday', () => {
    const s = parseScheduleFromString('mon');
    expect(s!.type).toBe(ScheduleType.WEEKLY);
    expect(s!.weeklyTime?.days).toEqual([Weekday.MONDAY]);
  });

  it('parses "每周一" as recurring', () => {
    const s = parseScheduleFromString('每周一');
    expect(s!.type).toBe(ScheduleType.WEEKLY);
    expect(s!.weeklyTime?.days).toEqual([Weekday.MONDAY]);
    expect(s!.weeklyTime?.recurring).toBe(true);
  });

  it('parses "every monday" as recurring', () => {
    const s = parseScheduleFromString('every monday');
    expect(s!.weeklyTime?.days).toEqual([Weekday.MONDAY]);
    expect(s!.weeklyTime?.recurring).toBe(true);
  });

  it('prefers exact match over substring', () => {
    // 'mon' should match exactly, not 'monday' substring
    const s = parseScheduleFromString('mon');
    expect(s!.weeklyTime?.days).toEqual([Weekday.MONDAY]);
  });

  it('parses date string "2026-05-15" with default 10:00 time', () => {
    const s = parseScheduleFromString('2026-05-15');
    expect(s!.type).toBe(ScheduleType.TIME);
    expect(s!.quickTime?.time).toBe('2026-05-15 10:00:00');
  });

  it('parses compact datetime "202603061513" → YYYY-MM-DD HH:MM:SS', () => {
    const s = parseScheduleFromString('202603061513');
    expect(s!.type).toBe(ScheduleType.TIME);
    expect(s!.quickTime?.time).toBe('2026-03-06 15:13:00');
  });

  it('parses compact date "20260306" → YYYY-MM-DD with default 10:00', () => {
    const s = parseScheduleFromString('20260306');
    expect(s!.type).toBe(ScheduleType.TIME);
    expect(s!.quickTime?.time).toBe('2026-03-06 10:00:00');
  });

  it('parses time-only "15:33" as today at that time', () => {
    const s = parseScheduleFromString('15:33');
    expect(s!.type).toBe(ScheduleType.TIME);
    expect(s!.quickTime?.time).toMatch(/^\d{4}-\d{2}-\d{2} 15:33:00$/);
  });

  it('parses time-only "9:05" with leading hour', () => {
    const s = parseScheduleFromString('9:05');
    expect(s!.type).toBe(ScheduleType.TIME);
    expect(s!.quickTime?.time).toMatch(/^\d{4}-\d{2}-\d{2} 09:05:00$/);
  });

  it('parses datetime string', () => {
    const s = parseScheduleFromString('2026-05-15 14:30:00');
    expect(s!.type).toBe(ScheduleType.TIME);
    expect(s!.quickTime?.time).toBe('2026-05-15 14:30:00');
  });

  it('returns null for unknown input', () => {
    expect(parseScheduleFromString('xyz')).toBeNull();
    expect(parseScheduleFromString('')).toBeNull();
  });
});

describe('isScheduleExpired', () => {
  it('returns false for QUICK schedule with future date', () => {
    const s = createSpecificDateSchedule('2099-12-31');
    expect(isScheduleExpired(s)).toBe(false);
  });

  it('returns true for QUICK schedule with past date', () => {
    const s = createSpecificDateSchedule('2020-01-01');
    expect(isScheduleExpired(s)).toBe(true);
  });

  it('returns false for WEEKLY schedule (never expires)', () => {
    const s = createWeekdaySchedule(Weekday.MONDAY);
    expect(isScheduleExpired(s)).toBe(false);
  });

  it('returns true for expired TIME schedule', () => {
    const s = new Schedule(ScheduleType.TIME, {
      quickTime: { time: '2020-01-01 00:00:00' },
    });
    expect(isScheduleExpired(s)).toBe(true);
  });
});

describe('migrateSchedule', () => {
  it('returns undefined for null/undefined', () => {
    expect(migrateSchedule(null)).toBeUndefined();
    expect(migrateSchedule(undefined)).toBeUndefined();
  });

  it('returns undefined for type "none"', () => {
    expect(migrateSchedule({ type: 'none' })).toBeUndefined();
  });

  it('migrates old "today" to QUICK', () => {
    const s = migrateSchedule({ type: 'today' });
    expect(s).toBeInstanceOf(Schedule);
    expect(s!.type).toBe(ScheduleType.QUICK);
  });

  it('migrates old "specific_date" to QUICK', () => {
    const s = migrateSchedule({ type: 'specific_date', specificDate: '2025-05-08' });
    expect(s!.type).toBe(ScheduleType.QUICK);
    expect(s!.quickTime?.date).toBe('2025-05-08');
  });

  it('migrates old "weekday" preserving isRecurring', () => {
    const s = migrateSchedule({ type: 'weekday', weekday: 1, isRecurring: true });
    expect(s!.type).toBe(ScheduleType.WEEKLY);
    expect(s!.weeklyTime?.days).toEqual([Weekday.MONDAY]);
    expect(s!.weeklyTime?.recurring).toBe(true);
  });

  it('migrates old "datetime_range" to RANGE', () => {
    const s = migrateSchedule({
      type: 'datetime_range',
      startDateTime: '2025-05-08 09:00:00',
      endDateTime: '2025-05-09 18:00:00',
    });
    expect(s!.type).toBe(ScheduleType.RANGE);
    expect(s!.rangeTime?.startDateTime).toBe('2025-05-08 09:00:00');
    expect(s!.rangeTime?.endDateTime).toBe('2025-05-09 18:00:00');
  });

  it('passes through new format data', () => {
    const s = migrateSchedule({
      type: 'weekly',
      weeklyTime: { days: [1, 3, 5], recurring: true },
    });
    expect(s).toBeInstanceOf(Schedule);
    expect(s!.type).toBe(ScheduleType.WEEKLY);
    expect(s!.weeklyTime?.days).toEqual([1, 3, 5]);
    expect(s!.weeklyTime?.recurring).toBe(true);
  });
});

describe('factory functions', () => {
  it('createTodaySchedule returns QUICK with today date', () => {
    const s = createTodaySchedule();
    expect(s.type).toBe(ScheduleType.QUICK);
    expect(s.quickTime?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('createTomorrowSchedule returns QUICK with future date', () => {
    const s = createTomorrowSchedule();
    expect(s.type).toBe(ScheduleType.QUICK);
    expect(s.quickTime?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('createWeekdaySchedule preserves recurring flag', () => {
    const s = createWeekdaySchedule(Weekday.FRIDAY, true);
    expect(s.type).toBe(ScheduleType.WEEKLY);
    expect(s.weeklyTime?.recurring).toBe(true);
  });
});

describe('getScheduleDisplay — 智能展示文案 + 提醒状态', () => {
  const NOW = new Date(2026, 4, 8, 12, 0, 0); // 2026-05-08 周五
  const date = (d: string) => createSpecificDateSchedule(d);
  const dt = (s: string) => createSpecificDateTimeSchedule(s);

  it('今天：显示 Today，状态 today', () => {
    const r = getScheduleDisplay(date('2026-05-08'), NOW);
    expect(r.text).toBe('Today');
    expect(r.status).toBe('today');
  });

  it('今天的时间：只显示时间不显示日期', () => {
    const r = getScheduleDisplay(dt('2026-05-08 14:30:00'), NOW);
    expect(r.text).toBe('14:30');
    expect(r.status).toBe('today');
  });

  it('明天：Tomorrow（+时间）', () => {
    expect(getScheduleDisplay(date('2026-05-09'), NOW).text).toBe('Tomorrow');
    expect(getScheduleDisplay(dt('2026-05-09 09:00:00'), NOW).text).toBe('Tomorrow 09:00');
  });

  it('昨天：Yesterday', () => {
    const r = getScheduleDisplay(date('2026-05-07'), NOW);
    expect(r.text).toBe('Yesterday');
    expect(r.status).toBe('overdue');
  });

  it('过期：状态 overdue', () => {
    const r = getScheduleDisplay(date('2026-05-01'), NOW);
    expect(r.status).toBe('overdue');
  });

  it('未来 7 天内：显示具体日期（+时间），状态 upcoming', () => {
    const r = getScheduleDisplay(date('2026-05-10'), NOW); // 周日
    expect(r.text).toBe('2026-05-10');
    expect(r.status).toBe('upcoming');
    const rt = getScheduleDisplay(dt('2026-05-10 08:30:00'), NOW);
    expect(rt.text).toBe('2026-05-10 08:30');
  });

  it('远期：原始日期，状态 normal', () => {
    const r = getScheduleDisplay(date('2026-12-01'), NOW);
    expect(r.text).toBe('2026-12-01');
    expect(r.status).toBe('normal');
  });

  it('每周重复：保持原文案，状态 normal', () => {
    const r = getScheduleDisplay(createWeekdaySchedule(Weekday.MONDAY, true), NOW);
    expect(r.status).toBe('normal');
    expect(r.text.length).toBeGreaterThan(0);
  });

  it('时间范围：显示起止时间', () => {
    const r = getScheduleDisplay(createSpecificDateTimeSchedule('2026-05-08 10:00:00'), NOW);
    void r;
    const range = new Schedule(ScheduleType.RANGE, {
      rangeTime: { startDateTime: '2026-05-08 10:00:00', endDateTime: '2026-05-08 12:00:00' },
    });
    const rr = getScheduleDisplay(range, NOW);
    expect(rr.text).toBe('10:00-12:00');
    expect(rr.status).toBe('today');
  });
});
