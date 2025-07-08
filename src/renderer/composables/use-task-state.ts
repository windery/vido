/**
 * 任务状态 Composable（组合器）
 * 组合所有任务相关的 composables，提供统一的接口
 */

import { useTaskStateGetters } from './use-task-state-getters';
import { useTaskSelection } from './use-task-selection';
import { useEditingModes } from './use-editing-modes';
import { useCursor } from './use-cursor';
import { useTaskActions } from './use-task-actions';
import { getTaskDataManager } from './task-state-manager';

export function useTaskState() {
  // 组合所有子模块
  const stateGetters = useTaskStateGetters();
  const selection = useTaskSelection();
  const editingModes = useEditingModes();
  const cursor = useCursor();
  const actions = useTaskActions();

  // 获取原始管理器（用于高级操作）
  const taskDataManager = getTaskDataManager();

  return {
    // ============ 响应式状态 ============
    ...stateGetters,

    // ============ 任务选择 ============
    ...selection,

    // ============ 编辑模式 ============
    ...editingModes,

    // ============ 光标操作 ============
    ...cursor,

    // ============ 任务动作 ============
    ...actions,

    // ============ 原始管理器访问 ============
    taskDataManager,
  };
}
