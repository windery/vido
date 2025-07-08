import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

class Sync {
  createVidoDir(): void {
    const userHome = app.getPath('home');
    const vidoDir = path.join(userHome, '.vido');
    if (!fs.existsSync(vidoDir)) {
      fs.mkdirSync(vidoDir);
    }
  }
}

const sync = new Sync();

export default sync;
