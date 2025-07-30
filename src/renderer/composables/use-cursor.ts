/**
 * 光标 Composable
 * 处理光标移动、位置管理和UI交互
 */

import { Task, TaskState } from '../domain/task';
import { getTaskDataManager } from './task-state-manager';
import { useTaskStateGetters } from './use-task-state-getters';
import { logger } from '../utils/logger';

export function useCursor() {
  const taskDataManager = getTaskDataManager();
  const { tasks } = useTaskStateGetters();

  // ============ 光标移动 ============
  const moveCursorUp = () => {
    taskDataManager.moveCursorUp();
  };

  const moveCursorDown = () => {
    taskDataManager.moveCursorDown();
  };

  const moveCursorLeft = () => {
    taskDataManager.moveCursorLeft();
  };

  const moveCursorRight = () => {
    taskDataManager.moveCursorRight();
  };

  // ============ 光标位置管理 ============
  const updateCursorPosition = (line: number, column: number) => {
    taskDataManager.updateCursorPosition(line, column);
  };

  // ============ UI交互方法 ============
  const updateContentWithCursor = (taskId: number) => {
    const task = tasks.value.find((t: Task) => t.id === taskId);
    if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return;

    logger.info(
      'useCursor',
      `updateContentWithCursor called for task ${taskId}`
    );

    // 触发事件通知UI层更新光标显示
    const event = new CustomEvent('cursor-update', {
      detail: {
        taskId,
        line: task.cursorLine || 0,
        column: task.cursorColumn || 0,
      },
    });
    document.dispatchEvent(event);
  };

  return {
    // 光标移动
    moveCursorUp,
    moveCursorDown,
    moveCursorLeft,
    moveCursorRight,

    // 光标位置管理
    updateCursorPosition,

    // UI交互
    updateContentWithCursor,
  };
}
