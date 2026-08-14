/**
 * 应用偏好 Store（响应式单例）
 *
 * 桌面应用原则：数据与配置一律落盘——偏好持久化到磁盘
 * `<root>/data/prefs.json`（经 IPC 文件通道，dev: ~/.vido-dev，prod: ~/.vido，
 * 与任务数据同环境隔离，见 src/main/paths.ts）。
 * 非 Electron 环境（浏览器调试/单测）自动回退 localStorage；
 * 旧版本 localStorage 偏好（vido.prefs.v1）在首次启动时自动迁移到磁盘。
 */
import { reactive } from 'vue';
import { logger } from '../../utils/logger';
import { applyTheme } from '../../utils/theme';
import { loadJsonFile, saveJsonFile } from '../../utils/file-operations-ipc';

export type ThemeMode = 'dark' | 'light';

/** 偏好落盘文件名（位于数据根目录 <root>/data/ 下） */
const PREFS_FILENAME = 'prefs.json';
/** 旧版本遗留的 localStorage 键（迁移来源） */
const LEGACY_KEY = 'vido.prefs.v1';

interface Prefs {
  theme: ThemeMode;
}

/** 当前偏好（响应式）。initPrefs 完成前为默认 dark，加载后更新。 */
export const prefs = reactive<Prefs>({ theme: 'dark' });

let initialized = false;

function normalizeTheme(value: unknown): ThemeMode {
  return value === 'light' ? 'light' : 'dark';
}

/** 从磁盘读取偏好；无文件/损坏返回 null */
async function loadFromDisk(): Promise<Prefs | null> {
  try {
    const raw = await loadJsonFile(PREFS_FILENAME);
    if (raw && typeof raw === 'object') {
      return { theme: normalizeTheme((raw as Prefs).theme) };
    }
  } catch (e) {
    logger.warn('Prefs', 'Failed to load prefs from disk', { error: e });
  }
  return null;
}

/** 读取旧版本 localStorage 偏好（迁移来源） */
function loadLegacy(): Prefs | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) return { theme: normalizeTheme(JSON.parse(raw).theme) };
  } catch {
    // 忽略损坏的旧值
  }
  return null;
}

/** 落盘保存（非 Electron 环境自动回退 localStorage） */
async function persist(p: Prefs): Promise<void> {
  try {
    await saveJsonFile(PREFS_FILENAME, { theme: p.theme });
  } catch (e) {
    logger.warn('Prefs', 'Failed to save prefs', { error: e });
  }
}

/** 应用启动时调用：磁盘 → 旧 localStorage 迁移 → 默认 dark；随后应用主题 */
export async function initPrefs(): Promise<void> {
  if (initialized) return;
  initialized = true;

  let p = await loadFromDisk();
  if (!p) {
    p = loadLegacy() ?? { theme: 'dark' };
    await persist(p); // 首次启动/旧版迁移：偏好落盘
  }

  prefs.theme = p.theme;
  applyTheme(p.theme);
  logger.info('Prefs', `Prefs initialized: theme=${p.theme}`);
}

export function setTheme(theme: ThemeMode): void {
  prefs.theme = theme;
  void persist({ theme });
  applyTheme(theme);
  logger.info('Prefs', `Theme set to ${theme}`);
}

export function toggleTheme(): void {
  setTheme(prefs.theme === 'dark' ? 'light' : 'dark');
}
