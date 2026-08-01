import { app, BrowserWindow, shell, ipcMain, Menu } from 'electron';
// import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeFileOperations } from './file-operations';
import { logger, writeLogToFile, getLogFilePath, LogEntry } from './logger';
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

// 后台测试模式：窗口保持隐藏、不抢焦点，仅通过日志观察运行状态。
// 用法：VIDO_BACKGROUND=1 pnpm dev
export const BACKGROUND = process.env.VIDO_BACKGROUND === '1';

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

// 默认 Electron 菜单把 Ctrl+R 绑定为「重新加载」，会在渲染进程收到按键前劫持它，
// 导致 vim 的 Ctrl+R 重做失效。改为自定义菜单，去掉 reload 加速键，保留系统级编辑快捷键。
function setupAppMenu(): void {
  const isMac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

let win: BrowserWindow | null = null;
const preload = path.join(__dirname, '../preload/index.mjs');
const indexHtml = path.join(RENDERER_DIST, 'index.html');

// 强制让主窗口获得 OS 焦点。macOS 从终端启动时不会自动激活新应用，
// 只调 win.focus() 不够，需要 app.focus({ steal: true }) 显式激活才能抢回焦点。
// 后台测试模式下跳过，避免弹窗抢焦点干扰用户工作。
function focusMainWindow(): void {
  if (BACKGROUND) return;
  if (!win) return;
  win.focus();
  win.webContents.focus();
  app.focus({ steal: true });
}

async function createWindow() {
  win = new BrowserWindow({
    title: 'Vido',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    width: 1000,
    height: 700,
    show: false, // 等渲染完成再显示，避免白屏并确保显示时立即获得焦点
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      contextIsolation: true,
    },
  });

  // 渲染完成（首次绘制）后显示窗口并强制获取焦点；后台模式保持隐藏
  win.once('ready-to-show', () => {
    if (!BACKGROUND) {
      win?.show();
      focusMainWindow();
    }
  });

  if (VITE_DEV_SERVER_URL) {
    // #298
    win.loadURL(VITE_DEV_SERVER_URL);
    // 默认关闭 DevTools（TDD 工作流下用日志排查，不需要抢焦点的调试窗口）。
    // 显式设置 VIDO_DEVTOOLS=1 时再打开。
    if (process.env.VIDO_DEVTOOLS === '1') {
      win.webContents.openDevTools({ mode: 'detach' });
      // detached DevTools 是独立窗口，打开时会抢走焦点，重新聚焦回主窗口
      win.webContents.once('devtools-opened', () => {
        focusMainWindow();
      });
    }
  } else {
    win.loadFile(indexHtml);
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
    // 确保焦点在主窗口而不是开发者工具（与 ready-to-show 互为兜底）；后台模式跳过
    if (!BACKGROUND) focusMainWindow();
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
    // 替换默认菜单，避免 Ctrl+R 被当作重载劫持
    setupAppMenu();
    // 创建窗口
    createWindow();
    // 启动提示：日志文件位置，便于 agent 定位排查
    logger.info('MainProcess', 'Log file', { path: getLogFilePath() });
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
ipcMain.handle('write-log', async (_event, logEntry: LogEntry) => {
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
