import { describe, it, expect } from 'vitest';
import { Schedule, ScheduleType, Weekday } from '../schedule';

describe('Schedule', () => {
  describe('QUICK type', () => {
    it('displays date string directly', () => {
      const s = new Schedule(ScheduleType.QUICK, {
        quickTime: { date: '2026-05-15' },
      });
      expect(s.getDisplayText()).toBe('2026-05-15');
    });

    it('returns empty when quickTime is missing', () => {
      const s = new Schedule(ScheduleType.QUICK);
      expect(s.getDisplayText()).toBe('');
    });
  });

  describe('TIME type', () => {
    it('formats valid datetime', () => {
      const s = new Schedule(ScheduleType.TIME, {
        quickTime: { time: '2026-05-15 14:30:00' },
      });
      // new Date('2026-05-15 14:30:00') is parsed in V8/Chromium
      const text = s.getDisplayText();
      expect(text).toContain('2026-05-15');
      expect(text).toContain('14:30:00');
    });

    it('falls back to raw string for invalid date', () => {
      const s = new Schedule(ScheduleType.TIME, {
        quickTime: { time: 'not-a-date' },
      });
      expect(s.getDisplayText()).toBe('not-a-date');
    });
  });

  describe('WEEKLY type', () => {
    it('displays single weekday name', () => {
      const s = new Schedule(ScheduleType.WEEKLY, {
        weeklyTime: { days: [Weekday.MONDAY] },
      });
      expect(s.getDisplayText()).toBe('Mon');
    });

    it('displays "每" prefix when recurring', () => {
      const s = new Schedule(ScheduleType.WEEKLY, {
        weeklyTime: { days: [Weekday.MONDAY], recurring: true },
      });
      expect(s.getDisplayText()).toBe('every Mon');
    });

    it('shows multiple days joined by comma', () => {
      const s = new Schedule(ScheduleType.WEEKLY, {
        weeklyTime: { days: [Weekday.MONDAY, Weekday.WEDNESDAY, Weekday.FRIDAY] },
      });
      expect(s.getDisplayText()).toBe('Mon, Wed, Fri');
    });

    it('returns empty when days array is empty', () => {
      const s = new Schedule(ScheduleType.WEEKLY, {
        weeklyTime: { days: [] },
      });
      expect(s.getDisplayText()).toBe('');
    });
  });

  describe('RANGE type', () => {
    it('displays date range', () => {
      const s = new Schedule(ScheduleType.RANGE, {
        rangeTime: {
          startDateTime: '2026-05-15 09:00:00',
          endDateTime: '2026-05-17 18:00:00',
        },
      });
      const text = s.getDisplayText();
      expect(text).toContain('-');
      expect(text).toContain('2026-05-15');
      expect(text).toContain('2026-05-17');
    });

    it('falls back to raw string for invalid dates', () => {
      const s = new Schedule(ScheduleType.RANGE, {
        rangeTime: {
          startDateTime: 'not-a-date',
          endDateTime: 'also-not-a-date',
        },
      });
      const text = s.getDisplayText();
      expect(text).toContain('not-a-date');
      expect(text).toContain('also-not-a-date');
    });
  });

  describe('getShortText', () => {
    it('returns only date part for TIME type', () => {
      const s = new Schedule(ScheduleType.TIME, {
        quickTime: { time: '2026-05-15 14:30:00' },
      });
      expect(s.getShortText()).toBe('2026-05-15');
    });

    it('returns full text for WEEKLY type', () => {
      const s = new Schedule(ScheduleType.WEEKLY, {
        weeklyTime: { days: [Weekday.MONDAY], recurring: true },
      });
      expect(s.getShortText()).toBe('every Mon');
    });
  });
});
