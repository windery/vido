/**
 * i18n 入口 —— 单语言（英文）翻译助手
 * 词典见 ./en；t() 支持 {var} 插值。
 */

import { en } from './en';

export type { HelpItem, HelpSection } from './en';

/** 翻译：t('header.tasks', { n: 3 }) → "3 tasks" */
export function t(key: string, vars?: Record<string, string | number>): string {
  const value = key
    .split('.')
    .reduce<any>((acc, k) => (acc == null ? undefined : acc[k]), en);
  if (typeof value !== 'string') return key;
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] != null ? String(vars[k]) : `{${k}}`
  );
}

/** 帮助面板的分节内容 */
export function helpSections() {
  return en.help.sections;
}

/** 周几名称（固定英文） */
export function weekdayName(weekday: number): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return names[weekday] ?? '';
}
