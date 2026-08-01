// Global type definitions for Electron preload APIs

declare global {
  interface Window {
    ipcRenderer: {
      on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
      off: (channel: string, listener?: (...args: any[]) => void) => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
    
    vidoLogger: {
      writeLog: (logEntry: { level: string; module: string; message: string; data?: any }) => Promise<void>;
    };
  }
}

export {};