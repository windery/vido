/**
 * 编辑模式 Composable
 * 处理各种编辑模式的切换和状态转换
 */

import { getTaskDataManager } from './task-state-manager';

export function useEditingModes() {
  const taskDataManager = getTaskDataManager();

  // ============ 编辑模式切换 ============
  const startContentNavigation = () => {
    taskDataManager.startContentNavigation();
  };

  const startEditingAtCursor = () => {
    taskDataManager.startEditingAtCursor();
  };

  const stopEditing = () => {
    taskDataManager.stopEditing();
  };

  const startTitleEditing = () => {
    taskDataManager.startTitleEditing();
  };

  // ============ 状态转换 ============
  const transition = (trigger: string, context?: any) => {
    return taskDataManager.transition(trigger, context);
  };

  return {
    // 编辑模式切换
    startContentNavigation,
    startEditingAtCursor,
    stopEditing,
    startTitleEditing,

    // 状态转换
    transition,
  };
}
