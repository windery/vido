/**
 * 主进程路径与环境判定（单一事实来源）
 *
 * 开发环境（pnpm dev）与生产环境数据完全隔离：
 *   dev  → ~/.vido-dev/{data,log}
 *   prod → ~/.vido/{data,log}
 * 本地开发/调试绝不读写真实任务数据与日志。
 */
import * as os from 'node:os';
import * as path from 'node:path';

/** 是否开发环境（与 test-server 的启用条件一致：vite 注入 VITE_DEV_SERVER_URL 或显式 NODE_ENV=development） */
export function isDev(): boolean {
  return process.env.NODE_ENV === 'development' || !!process.env.VITE_DEV_SERVER_URL;
}

/** 数据/日志根目录：dev → ~/.vido-dev，prod → ~/.vido */
export function getVidoRootDir(): string {
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
