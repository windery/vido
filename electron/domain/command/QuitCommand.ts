import { ipcMain } from 'electron';
import shortcut from '../Shortcuts';

class QuitCommand implements Command {
  name: string;

  constructor() {
    this.name = 'quit';
  }

  execute(): void {}
}
