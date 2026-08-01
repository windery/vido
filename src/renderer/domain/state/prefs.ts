/**
 * 应用偏好 Store（响应式单例）
 * 管理主题（深色/浅色）与语言（中文/英文），localStorage 持久化。
 * 属于 domain/state —— 与任务数据无关的 UI 级状态。
 */

import { reactive } from 'vue';
import { logger } from '../../utils/logger';
import { applyTheme } from '../../utils/theme';

export type ThemeMode = 'dark' | 'light';
export type Lang = 'zh' | 'en';

const PREFS_KEY = 'vido.prefs.v1';

interface Prefs {
  theme: ThemeMode;
  lang: Lang;
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const theme: ThemeMode = parsed.theme === 'light' ? 'light' : 'dark';
      const lang: Lang = parsed.lang === 'en' ? 'en' : 'zh';
      return { theme, lang };
    }
  } catch (e) {
    logger.warn('Prefs', 'Failed to load prefs', { error: e });
  }
  return { theme: 'dark', lang: 'zh' };
}

function savePrefs(): void {
  try {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ theme: prefs.theme, lang: prefs.lang })
    );
  } catch (e) {
    logger.warn('Prefs', 'Failed to save prefs', { error: e });
  }
}

export const prefs = reactive<Prefs>(loadPrefs());

export function setTheme(theme: ThemeMode): void {
  prefs.theme = theme;
  savePrefs();
  applyTheme(theme);
  logger.info('Prefs', `Theme set to ${theme}`);
}

export function toggleTheme(): void {
  setTheme(prefs.theme === 'dark' ? 'light' : 'dark');
}

function applyLangToDom(lang: Lang): void {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
}

export function setLang(lang: Lang): void {
  prefs.lang = lang;
  savePrefs();
  applyLangToDom(lang);
  logger.info('Prefs', `Language set to ${lang}`);
}

export function toggleLang(): void {
  setLang(prefs.lang === 'zh' ? 'en' : 'zh');
}

/** 应用启动时调用：把持久化偏好应用到 DOM */
export function initPrefs(): void {
  applyTheme(prefs.theme);
  applyLangToDom(prefs.lang);
  logger.info('Prefs', `Prefs initialized: theme=${prefs.theme}, lang=${prefs.lang}`);
}
