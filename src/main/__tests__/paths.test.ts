// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import { isDev, getVidoRootDir, getVidoDataDir, getVidoLogDir } from '../paths';

/** 设置/删除环境变量（避免 delete 必选属性的 TS 报错） */
function setEnvVar(key: string, value: string | undefined): void {
  if (value === undefined) Reflect.deleteProperty(process.env, key);
  else process.env[key] = value;
}

describe('paths — dev/prod 环境隔离', () => {
  const OLD_NODE_ENV = process.env.NODE_ENV;
  const OLD_VITE = process.env.VITE_DEV_SERVER_URL;

  afterEach(() => {
    setEnvVar('NODE_ENV', OLD_NODE_ENV);
    setEnvVar('VITE_DEV_SERVER_URL', OLD_VITE);
  });

  it('VITE_DEV_SERVER_URL 存在 → dev，根目录 .vido-dev', () => {
    setEnvVar('NODE_ENV', undefined);
    setEnvVar('VITE_DEV_SERVER_URL', 'http://127.0.0.1:5173/');
    expect(isDev()).toBe(true);
    expect(getVidoRootDir()).toBe(path.join(os.homedir(), '.vido-dev'));
    expect(getVidoDataDir()).toBe(path.join(os.homedir(), '.vido-dev', 'data'));
    expect(getVidoLogDir()).toBe(path.join(os.homedir(), '.vido-dev', 'log'));
  });

  it('NODE_ENV=development → dev', () => {
    setEnvVar('NODE_ENV', 'development');
    setEnvVar('VITE_DEV_SERVER_URL', undefined);
    expect(isDev()).toBe(true);
    expect(getVidoRootDir()).toBe(path.join(os.homedir(), '.vido-dev'));
  });

  it('生产（无 dev 标记）→ .vido', () => {
    setEnvVar('NODE_ENV', 'production');
    setEnvVar('VITE_DEV_SERVER_URL', undefined);
    expect(isDev()).toBe(false);
    expect(getVidoRootDir()).toBe(path.join(os.homedir(), '.vido'));
    expect(getVidoDataDir()).toBe(path.join(os.homedir(), '.vido', 'data'));
    expect(getVidoLogDir()).toBe(path.join(os.homedir(), '.vido', 'log'));
  });

  it('dev 与 prod 目录不同（隔离保证）', () => {
    setEnvVar('NODE_ENV', undefined);
    setEnvVar('VITE_DEV_SERVER_URL', 'http://127.0.0.1:5173/');
    const devData = getVidoDataDir();
    setEnvVar('NODE_ENV', 'production');
    setEnvVar('VITE_DEV_SERVER_URL', undefined);
    expect(getVidoDataDir()).not.toBe(devData);
  });
});
