/**
 * 任务选择 Composable
 * 处理任务选择和快速导航操作
 */

import { getTaskDataManager } from './task-state-manager';

export function useTaskSelection() {
  const taskDataManager = getTaskDataManager();

  // ============ 任务选择 ============
  const selectTask = (taskId: number) => {
    taskDataManager.selectTask(taskId);
  };

  const selectNext = async () => {
    await taskDataManager.selectNext();
  };

  const selectPrevious = async () => {
    await taskDataManager.selectPrevious();
  };

  // ============ 快速导航 ============
  const goToFirst = () => {
    taskDataManager.goToFirst();
  };

  const goToLast = () => {
    taskDataManager.goToLast();
  };

  return {
    // 任务选择
    selectTask,
    selectNext,
    selectPrevious,

    // 快速导航
    goToFirst,
    goToLast,
  };
}
