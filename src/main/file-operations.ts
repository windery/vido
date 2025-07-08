/**
 * Electron 主进程文件操作
 * 处理文件系统操作，通过 IPC 与渲染进程通信
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ipcMain } from 'electron';
import { logger } from './logger';

/**
 * 获取 .vido/data 目录路径
 */
function getVidoDataDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.vido', 'data');
}

/**
 * 确保 .vido/data 目录存在
 */
function ensureVidoDataDir(): void {
  const dataDir = getVidoDataDir();

  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.info('FileOperations', `Created .vido/data directory: ${dataDir}`);
    }
  } catch (error) {
    logger.error(
      'FileOperations',
      'Failed to create .vido/data directory',
      error
    );
    throw error;
  }
}

/**
 * 初始化文件操作 IPC 处理器
 */
export function initializeFileOperations(): void {
  // 保存 JSON 文件
  ipcMain.handle(
    'save-json-file',
    async (event, filename: string, data: any) => {
      try {
        ensureVidoDataDir();

        const dataDir = getVidoDataDir();
        const filePath = path.join(dataDir, filename);

        const jsonData = JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, jsonData, 'utf8');

        logger.info('FileOperations', `Saved JSON file: ${filePath}`);
        return { success: true, filePath };
      } catch (error) {
        logger.error('FileOperations', 'Failed to save JSON file', error);
        return { success: false, error: (error as Error).message };
      }
    }
  );

  // 加载 JSON 文件
  ipcMain.handle('load-json-file', async (event, filename: string) => {
    try {
      const dataDir = getVidoDataDir();
      const filePath = path.join(dataDir, filename);

      if (!fs.existsSync(filePath)) {
        logger.info('FileOperations', `JSON file not found: ${filePath}`);
        return { success: true, data: null };
      }

      const jsonData = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(jsonData);

      logger.info('FileOperations', `Loaded JSON file: ${filePath}`);
      return { success: true, data };
    } catch (error) {
      logger.error('FileOperations', 'Failed to load JSON file', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 检查 JSON 文件是否存在
  ipcMain.handle('json-file-exists', async (event, filename: string) => {
    try {
      const dataDir = getVidoDataDir();
      const filePath = path.join(dataDir, filename);
      const exists = fs.existsSync(filePath);

      return { success: true, exists };
    } catch (error) {
      logger.error('FileOperations', 'Failed to check file existence', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 删除 JSON 文件
  ipcMain.handle('delete-json-file', async (event, filename: string) => {
    try {
      const dataDir = getVidoDataDir();
      const filePath = path.join(dataDir, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info('FileOperations', `Deleted JSON file: ${filePath}`);
      }

      return { success: true };
    } catch (error) {
      logger.error('FileOperations', 'Failed to delete JSON file', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 列出所有 JSON 文件
  ipcMain.handle('list-json-files', async (_event) => {
    try {
      const dataDir = getVidoDataDir();

      if (!fs.existsSync(dataDir)) {
        return { success: true, files: [] };
      }

      const files = fs.readdirSync(dataDir);
      const jsonFiles = files.filter((file) => file.endsWith('.json'));

      logger.info(
        'FileOperations',
        `Found ${jsonFiles.length} JSON files in ${dataDir}`
      );
      return { success: true, files: jsonFiles };
    } catch (error) {
      logger.error('FileOperations', 'Failed to list JSON files', error);
      return { success: false, error: (error as Error).message };
    }
  });

  logger.info('FileOperations', 'IPC handlers initialized');
}
