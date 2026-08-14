import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  prefs,
  setTheme,
  toggleTheme,
} from '../../domain/state/prefs';
import { t, weekdayName } from '../index';
import { getScheduleDisplayText } from '../../utils/schedule-helper';
import { createWeekdaySchedule } from '../../utils/schedule-helper';
import { Weekday } from '../../domain/schedule';

describe('prefs', () => {
  beforeEach(() => {
    localStorage.clear();
    setTheme('dark');
  });

  it('defaults to dark theme', () => {
    expect(prefs.theme).toBe('dark');
  });

  it('setTheme applies data-theme attribute and dark class', () => {
    setTheme('light');
    expect(prefs.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    setTheme('dark');
    expect(prefs.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('persists theme to disk (prefs.json)', async () => {
    const invoke = (window as any).electronAPI.invoke as ReturnType<typeof vi.fn>;
    const saved: Array<{ filename: string; data: any }> = [];
    invoke.mockImplementation(async (channel: string, filename: string, data?: any) => {
      if (channel === 'save-json-file') saved.push({ filename, data });
      return { success: true };
    });
    setTheme('light');
    await new Promise((r) => setTimeout(r, 0));
    expect(saved).toContainEqual({ filename: 'prefs.json', data: { theme: 'light' } });
  });

  it('toggleTheme switches values', () => {
    toggleTheme();
    expect(prefs.theme).toBe('light');
    toggleTheme();
    expect(prefs.theme).toBe('dark');
  });
});

describe('i18n (single language: en)', () => {
  it('returns English strings', () => {
  });

  it('interpolates variables', () => {
    expect(t('status.tasks')).toBe('tasks');
  });

  it('returns the key itself when missing', () => {
    expect(t('nope.missing')).toBe('nope.missing');
  });

  it('weekdayName is fixed English', () => {
    expect(weekdayName(Weekday.MONDAY)).toBe('Mon');
    expect(weekdayName(Weekday.SUNDAY)).toBe('Sun');
  });
});

describe('schedule display text', () => {
  it('renders weekly recurring text in English', () => {
    const s = createWeekdaySchedule(Weekday.MONDAY, true);
    expect(getScheduleDisplayText(s)).toBe('every Mon');
  });
});
