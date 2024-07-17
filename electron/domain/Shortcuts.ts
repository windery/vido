import { GlobalShortcut, globalShortcut, ipcMain } from 'electron';

class Shortcut {
  ipc: any;

  constructor(shortcutIpc: GlobalShortcut) {
    this.ipc = shortcutIpc;
  }

  unregisterAll() {
    globalShortcut.unregisterAll();
  }
}

const shortcut = new Shortcut(globalShortcut);

export default shortcut;
