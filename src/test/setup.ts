import { vi } from 'vitest';

(globalThis as any).window = globalThis;
(window as any).electronAPI = {
  invoke: vi.fn(),
};
(window as any).vidoLogger = {
  writeLog: vi.fn(),
};
