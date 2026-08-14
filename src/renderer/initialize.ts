import { initPrefs } from './domain/state/prefs';

/**
 * 应用启动初始化（main.ts 在挂载前 await）：
 * 从磁盘加载偏好（主题）并应用——桌面环境偏好持久化在
 * <root>/data/prefs.json，与任务数据同环境隔离。
 * 注意：任务数据在首次 useTaskState() 时自动加载，无需在此处理。
 */
export async function initialize(): Promise<void> {
  await initPrefs();
}
