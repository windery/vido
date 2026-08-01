import { beforeEach, describe, expect, it } from 'vitest';
import {
  prefs,
  setTheme,
  setLang,
  toggleTheme,
  toggleLang,
} from '../../domain/state/prefs';
import { t, weekdayName } from '../index';
import { getScheduleDisplayText } from '../../utils/schedule-helper';
import { createWeekdaySchedule } from '../../utils/schedule-helper';
import { Weekday } from '../../domain/schedule';

describe('prefs', () => {
  beforeEach(() => {
    localStorage.clear();
    setTheme('dark');
    setLang('zh');
  });

  it('defaults to dark theme and zh lang', () => {
    expect(prefs.theme).toBe('dark');
    expect(prefs.lang).toBe('zh');
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

  it('persists prefs to localStorage', () => {
    setTheme('light');
    setLang('en');
    const saved = JSON.parse(localStorage.getItem('vido.prefs.v1') as string);
    expect(saved).toEqual({ theme: 'light', lang: 'en' });
  });

  it('toggleTheme and toggleLang switch values', () => {
    toggleTheme();
    expect(prefs.theme).toBe('light');
    toggleTheme();
    expect(prefs.theme).toBe('dark');

    toggleLang();
    expect(prefs.lang).toBe('en');
    toggleLang();
    expect(prefs.lang).toBe('zh');
  });
});

describe('i18n', () => {
  it('translates header title by lang', () => {
    setLang('zh');
    expect(t('header.title')).toBe('Vido - Vim 任务管理器');
    setLang('en');
    expect(t('header.title')).toBe('Vido - Vim Todo Manager');
  });

  it('interpolates variables', () => {
    setLang('zh');
    expect(t('header.tasks', { n: 3 })).toBe('3 个任务');
    setLang('en');
    expect(t('header.tasks', { n: 3 })).toBe('3 tasks');
  });

  it('returns the key itself when missing', () => {
    expect(t('nope.missing')).toBe('nope.missing');
  });

  it('weekdayName follows lang', () => {
    setLang('zh');
    expect(weekdayName(Weekday.MONDAY)).toBe('周一');
    setLang('en');
    expect(weekdayName(Weekday.MONDAY)).toBe('Mon');
  });
});

describe('schedule display text', () => {
  it('renders weekly recurring text by lang', () => {
    const s = createWeekdaySchedule(Weekday.MONDAY, true);

    setLang('zh');
    expect(getScheduleDisplayText(s)).toBe('每周一');

    setLang('en');
    expect(getScheduleDisplayText(s)).toBe('every Mon');
  });
});
