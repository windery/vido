/**
 * i18n 入口 —— 响应式翻译助手
 * 读取 prefs.lang（reactive），组件渲染期间调用会建立响应式依赖。
 */

import { prefs } from '../domain/state/prefs';
import { zh } from './zh';
import { en } from './en';

export type { Lang } from '../domain/state/prefs';
export type { HelpItem, HelpSection } from './zh';

export type Dictionary = typeof zh;

/** 取当前语言的词典 */
export function dict(): Dictionary {
  return prefs.lang === 'en' ? en : zh;
}

/** 翻译：t('header.tasks', { n: 3 }) → "3 个任务" */
export function t(key: string, vars?: Record<string, string | number>): string {
  const value = key
    .split('.')
    .reduce<any>((acc, k) => (acc == null ? undefined : acc[k]), dict());
  if (typeof value !== 'string') return key;
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] != null ? String(vars[k]) : `{${k}}`
  );
}

/** 帮助面板的分节内容 */
export function helpSections() {
  return dict().help.sections;
}

/** 周几名称（随语言变化） */
export function weekdayName(weekday: number): string {
  const names =
    prefs.lang === 'en'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return names[weekday] ?? '';
}
