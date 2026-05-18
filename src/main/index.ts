import { app, BrowserWindow, shell, ipcMain } from 'electron';
// import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeFileOperations } from './file-operations';
import { logger, writeLogToFile } from './logger';
import { startTestServer } from './test-server';

// const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..');

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

// Disable GPU Acceleration for Windows 7
if (process.platform === 'win32') {
  import('node:os').then((os) => {
    if (os.release().startsWith('6.1')) app.disableHardwareAcceleration();
  });
}

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win: BrowserWindow | null = null;
const preload = path.join(__dirname, '../preload/index.mjs');
const indexHtml = path.join(RENDERER_DIST, 'index.html');

async function createWindow() {
  win = new BrowserWindow({
    title: 'Vido',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    width: 1000,
    height: 700,
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      contextIsolation: true,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    // #298
    win.loadURL(VITE_DEV_SERVER_URL);
    // VS Code F5 已通过 port 9229 连接调试器，不需要再弹 DevTools 抢焦点
    if (!process.env.VSCODE_DEBUG) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    win.loadFile(indexHtml);
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
    // 确保焦点在主窗口而不是开发者工具
    if (win) {
      win.focus();
      win.webContents.focus();
    }
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url);
    return { action: 'deny' };
  });
  // win.webContents.on('will-navigate', (event, url) => { }) #344

  // 启动测试服务器
  startTestServer(win);
}

app
  .whenReady()
  .then(() => {
    // 初始化文件操作 IPC 处理器
    initializeFileOperations();
    // 创建窗口
    createWindow();
  })
  .catch((err) =>
    logger.error('MainProcess', 'App initialization failed', err)
  );

app.on('window-all-closed', () => {
  win = null;
  if (process.platform !== 'darwin') app.quit();
});

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, { hash: arg });
  }
});

// 处理退出应用请求
ipcMain.on('quit-app', () => {
  logger.info('MainProcess', '收到退出应用请求');
  app.quit();
});

// --------- Vido Logger IPC Handler ---------
ipcMain.handle('write-log', async (event, logEntry: string) => {
  try {
    // 直接调用logger的writeLogToFile方法
    writeLogToFile(logEntry);
    return { success: true };
  } catch (error) {
    logger.error('MainProcess', 'Failed to write log via IPC', error);
    return { success: false, error: (error as Error).message };
  }
});

app.on('will-quit', () => {
  logger.info('MainProcess', 'App will quit');
});
