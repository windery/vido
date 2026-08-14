/**
 * 主进程路径与环境判定（单一事实来源）
 *
 * 开发环境（pnpm dev）与生产环境数据完全隔离：
 *   dev  → ~/.vido-dev/{data,log}
 *   prod → ~/.vido/{data,log}
 * 后台测试模式（VIDO_BACKGROUND=1）进一步隔离到 ~/.vido-dev-test：
 *   绝不读写正常 dev/F5 实例的任务数据与日志。
 */

import * as os from 'node:os';
import * as path from 'node:path';

/** 是否开发环境（与 test-server 的启用条件一致：vite 注入 VITE_DEV_SERVER_URL 或显式 NODE_ENV=development） */
export function isDev(): boolean {
  return process.env.NODE_ENV === 'development' || !!process.env.VITE_DEV_SERVER_URL;
}

/** 是否后台测试模式（VIDO_BACKGROUND=1）：窗口隐藏 + 单实例锁豁免 + 数据/日志独立根目录 */
export function isBackground(): boolean {
  return process.env.VIDO_BACKGROUND === '1';
}

/** 数据/日志根目录：background → ~/.vido-dev-test，dev → ~/.vido-dev，prod → ~/.vido */
export function getVidoRootDir(): string {
  if (isBackground()) return path.join(os.homedir(), '.vido-dev-test');
  return path.join(os.homedir(), isDev() ? '.vido-dev' : '.vido');
}

/** 任务数据目录：<root>/data */
export function getVidoDataDir(): string {
  return path.join(getVidoRootDir(), 'data');
}

/** 日志目录：<root>/log */
export function getVidoLogDir(): string {
  return path.join(getVidoRootDir(), 'log');
}
