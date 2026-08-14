import { ipcRenderer, contextBridge } from 'electron';

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args)
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },

  // You can expose other APTs you need here.
  // ...
});

// --------- Vido Logger API ---------
contextBridge.exposeInMainWorld('vidoLogger', {
  writeLog: (logEntry: { level: string; module: string; message: string; data?: any }) => {
    return ipcRenderer.invoke('write-log', logEntry);
  },
});

// --------- System Clipboard API ---------
// p/P 粘贴系统剪贴板（外部复制内容）：走主进程 clipboard，规避渲染进程权限限制。
contextBridge.exposeInMainWorld('vidoClipboard', {
  readText: (): Promise<string> => ipcRenderer.invoke('clipboard-read-text'),
  writeText: (text: string): Promise<boolean> => ipcRenderer.invoke('clipboard-write-text', text),
});

// --------- Test API for keyboard simulation ---------
contextBridge.exposeInMainWorld('testAPI', {
  onKeyboardEvent: (callback: (data: { key: string }) => void) => {
    ipcRenderer.on('test-keyboard-event', (event, data) => callback(data));
  },
  onKeyboardSequence: (callback: (data: { keys: string[] }) => void) => {
    ipcRenderer.on('test-keyboard-sequence', (event, data) => callback(data));
  },
  simulateKey: (key: string) => {
    // 直接在渲染进程中分发键盘事件
    const event = new KeyboardEvent('keydown', {
      key: key,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
  },
  simulateSequence: (keys: string[]) => {
    // 依次模拟按键序列
    keys.forEach((key, index) => {
      setTimeout(() => {
        const event = new KeyboardEvent('keydown', {
          key: key,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);
      }, index * 50); // 每个按键间隔50ms
    });
  },
  isEnabled: () => {
    // 在开发环境下启用测试API
    return process.env.NODE_ENV === 'development';
  },
});

// --------- Preload scripts loading ---------
function domReady(
  condition: DocumentReadyState[] = ['complete', 'interactive']
) {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true);
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true);
        }
      });
    }
  });
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find((e) => e === child)) {
      return parent.appendChild(child);
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find((e) => e === child)) {
      return parent.removeChild(child);
    }
  },
};

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const className = `loaders-css__square-spin`;
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `;
  const oStyle = document.createElement('style');
  const oDiv = document.createElement('div');

  oStyle.id = 'app-loading-style';
  oStyle.innerHTML = styleContent;
  oDiv.className = 'app-loading-wrap';
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`;

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle);
      safeDOM.append(document.body, oDiv);
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle);
      safeDOM.remove(document.body, oDiv);
    },
  };
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading();
domReady().then(appendLoading);

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading();
};

setTimeout(removeLoading, 4999);
