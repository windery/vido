import { vi } from 'vitest';

// jsdom 中模拟 Electron 的 ipcRenderer
(globalThis as any).window = globalThis;
(window as any).electronAPI = {
  invoke: vi.fn(),
};

// 抑制 logger 在测试中的输出
vi.mock('../renderer/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
