import { describe, it, expect, beforeEach, vi } from 'vitest';

/** 磁盘模拟：内存 Map 充当 <root>/data/ 目录，经 mock IPC 读写 */
let disk: Record<string, any>;

/** 每次测试重新加载模块，获得干净的偏好单例 + 磁盘 */
async function freshPrefs() {
  vi.resetModules();
  return await import('../state/prefs');
}

function mockDisk(): void {
  disk = {};
  const invoke = (window as any).electronAPI.invoke as ReturnType<typeof vi.fn>;
  invoke.mockReset();
  invoke.mockImplementation(async (channel: string, filename: string, data?: any) => {
    if (channel === 'load-json-file') return { success: true, data: disk[filename] ?? null };
    if (channel === 'save-json-file') {
      disk[filename] = data;
      return { success: true };
    }
    return { success: true };
  });
}

beforeEach(() => {
  localStorage.clear();
  mockDisk();
});

describe('prefs — 偏好持久化到磁盘（prefs.json）', () => {
  it('首次启动默认 dark 并落盘 prefs.json', async () => {
    const m = await freshPrefs();
    await m.initPrefs();
    expect(m.prefs.theme).toBe('dark');
    expect(disk['prefs.json'].theme).toBe('dark');
  });

  it('setTheme 更新偏好并持久化到磁盘', async () => {
    const m = await freshPrefs();
    await m.initPrefs();
    m.setTheme('light');
    expect(m.prefs.theme).toBe('light');
    expect(disk['prefs.json'].theme).toBe('light');
  });

  it('旧版 localStorage 偏好（vido.prefs.v1）自动迁移到磁盘', async () => {
    localStorage.setItem('vido.prefs.v1', JSON.stringify({ theme: 'light' }));
    const m = await freshPrefs();
    await m.initPrefs();
    expect(m.prefs.theme).toBe('light');
    expect(disk['prefs.json'].theme).toBe('light');
  });

  it('磁盘已有偏好时优先使用，旧 localStorage 值不覆盖', async () => {
    disk['prefs.json'] = { theme: 'light' };
    localStorage.setItem('vido.prefs.v1', JSON.stringify({ theme: 'dark' }));
    const m = await freshPrefs();
    await m.initPrefs();
    expect(m.prefs.theme).toBe('light');
    expect(disk['prefs.json'].theme).toBe('light');
  });

  it('非法主题值归一化为 dark', async () => {
    disk['prefs.json'] = { theme: 'neon' };
    const m = await freshPrefs();
    await m.initPrefs();
    expect(m.prefs.theme).toBe('dark');
  });

  it('磁盘读取失败时回退默认值，不崩溃', async () => {
    const invoke = (window as any).electronAPI.invoke as ReturnType<typeof vi.fn>;
    invoke.mockImplementation(async () => ({ success: false, error: 'io error' }));
    const m = await freshPrefs();
    await m.initPrefs();
    expect(m.prefs.theme).toBe('dark');
  });
});
