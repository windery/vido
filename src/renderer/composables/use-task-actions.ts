/**
 * 任务动作 Composable
 * 处理任务的增删改查和各种操作动作
 */

import { getTaskDataManager } from './task-state-manager';

export function useTaskActions() {
  const taskDataManager = getTaskDataManager();

  // ============ 任务状态切换 ============
  const toggleTaskCompletion = () => {
    taskDataManager.toggleTaskCompletion();
  };

  // ============ 任务CRUD操作 ============
  const createNewTask = (title: string = '', insertAfter: boolean = true) => {
    return taskDataManager.createNewTask(title, insertAfter);
  };

  const deleteSelectedTask = () => {
    taskDataManager.deleteSelectedTask();
  };

  // ============ 任务复制粘贴 ============
  const copySelectedTask = () => {
    taskDataManager.copySelectedTask();
  };

  const pasteTask = () => {
    taskDataManager.pasteTask();
  };

  // ============ 调试方法 ============
  const getDebugInfo = () => {
    return taskDataManager.getDebugInfo();
  };

  return {
    // 任务状态切换
    toggleTaskCompletion,

    // 任务CRUD操作
    createNewTask,
    deleteSelectedTask,

    // 任务复制粘贴
    copySelectedTask,
    pasteTask,

    // 调试
    getDebugInfo,
  };
}
