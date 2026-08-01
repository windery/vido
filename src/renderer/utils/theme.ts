import type { ThemeMode } from '../domain/state/prefs';
import { logger } from './logger';

// 把主题应用到 DOM：html.dark 驱动 Element Plus 暗色变量，
// data-theme 属性驱动 style.css 中的浅色设计令牌覆盖。
export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }
  logger.info('Theme', `Applied ${theme} theme`);
}
