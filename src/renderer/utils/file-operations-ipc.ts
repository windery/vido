/**
 * 文件操作工具函数 - IPC 客户端
 * 通过 Electron IPC 与主进程通信来操作文件
 */

import { logger } from './logger';

// 获取 Electron IPC 渲染进程 API
const electronAPI = (window as any).electronAPI || (window as any).ipcRenderer;

/**
 * 检查是否在 Electron 环境中
 */
function isElectronEnvironment(): boolean {
  return typeof electronAPI !== 'undefined';
}

/**
 * 将数据保存为 JSON 文件
 */
export async function saveJsonFile(filename: string, data: any): Promise<void> {
  if (!isElectronEnvironment()) {
    logger.warn(
      'FileOperations',
      'Not in Electron environment, falling back to localStorage'
    );
    // 在非 Electron 环境中回退到 localStorage
    localStorage.setItem(`vido-${filename}`, JSON.stringify(data));
    return;
  }

  try {
    const result = await electronAPI.invoke('save-json-file', filename, data);

    if (result.success) {
      logger.info('FileOperations', `Saved JSON file: ${filename}`);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    logger.error('FileOperations', 'Failed to save JSON file', {
      error,
      filename,
    });
    throw error;
  }
}

/**
 * 从 JSON 文件加载数据
 */
export async function loadJsonFile(filename: string): Promise<any | null> {
  if (!isElectronEnvironment()) {
    logger.warn(
      'FileOperations',
      'Not in Electron environment, falling back to localStorage'
    );
    // 在非 Electron 环境中回退到 localStorage
    const data = localStorage.getItem(`vido-${filename}`);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  try {
    const result = await electronAPI.invoke('load-json-file', filename);

    if (result.success) {
      logger.info('FileOperations', `Loaded JSON file: ${filename}`);
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    logger.error('FileOperations', 'Failed to load JSON file', {
      error,
      filename,
    });
    return null;
  }
}

/**
 * 检查 JSON 文件是否存在
 */
export async function jsonFileExists(filename: string): Promise<boolean> {
  if (!isElectronEnvironment()) {
    // 在非 Electron 环境中检查 localStorage
    return localStorage.getItem(`vido-${filename}`) !== null;
  }

  try {
    const result = await electronAPI.invoke('json-file-exists', filename);

    if (result.success) {
      return result.exists;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    logger.error('FileOperations', 'Failed to check file existence', {
      error,
      filename,
    });
    return false;
  }
}

/**
 * 删除 JSON 文件
 */
export async function deleteJsonFile(filename: string): Promise<void> {
  if (!isElectronEnvironment()) {
    // 在非 Electron 环境中删除 localStorage 项
    localStorage.removeItem(`vido-${filename}`);
    return;
  }

  try {
    const result = await electronAPI.invoke('delete-json-file', filename);

    if (result.success) {
      logger.info('FileOperations', `Deleted JSON file: ${filename}`);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    logger.error('FileOperations', 'Failed to delete JSON file', {
      error,
      filename,
    });
    throw error;
  }
}

/**
 * 获取所有 JSON 文件列表
 */
export async function listJsonFiles(): Promise<string[]> {
  if (!isElectronEnvironment()) {
    // 在非 Electron 环境中列出 localStorage 中的 vido 文件
    const files: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('vido-')) {
        files.push(key.substring(5));
      }
    }
    return files;
  }

  try {
    const result = await electronAPI.invoke('list-json-files');

    if (result.success) {
      logger.info('FileOperations', `Found ${result.files.length} JSON files`);
      return result.files;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    logger.error('FileOperations', 'Failed to list JSON files', { error });
    return [];
  }
}
