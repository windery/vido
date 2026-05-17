/**
 * 光标管理器
 * 负责处理光标移动、内容编辑状态管理和相关操作
 */

import { TaskState } from '../task';
import { TaskDataState } from './task-data-manager';
import { EditorMode } from '../editor';
import { logger } from '../../utils/logger';

export class CursorManager {
  constructor(
    private getState: () => TaskDataState,
    private updateState: (updates: Partial<TaskDataState>) => void,
    private transition: (trigger: string, context?: any) => any
  ) {}





  /**
   * 向上移动光标
   */
  moveCursorUp(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask || selectedTask.status !== TaskState.CONTENT_NAVIGATION) {
      return;
    }

    const content = selectedTask.content || '';
    const lines = content.split('\n');
    const currentLine = selectedTask.cursorLine || 0;

    if (currentLine > 0) {
      const newLine = currentLine - 1;
      const newColumn = Math.min(
        selectedTask.cursorColumn || 0,
        lines[newLine]?.length || 0
      );

      this.updateCursorPosition(selectedTask.id, newLine, newColumn);
    }
  }

  /**
   * 向下移动光标
   */
  moveCursorDown(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask || selectedTask.status !== TaskState.CONTENT_NAVIGATION) {
      return;
    }

    const content = selectedTask.content || '';
    const lines = content.split('\n');
    const currentLine = selectedTask.cursorLine || 0;

    if (currentLine < lines.length - 1) {
      const newLine = currentLine + 1;
      const newColumn = Math.min(
        selectedTask.cursorColumn || 0,
        lines[newLine]?.length || 0
      );

      this.updateCursorPosition(selectedTask.id, newLine, newColumn);
    }
  }

  /**
   * 向左移动光标
   */
  moveCursorLeft(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask || selectedTask.status !== TaskState.CONTENT_NAVIGATION) {
      return;
    }

    const currentLine = selectedTask.cursorLine || 0;
    const currentColumn = selectedTask.cursorColumn || 0;

    if (currentColumn > 0) {
      this.updateCursorPosition(
        selectedTask.id,
        currentLine,
        currentColumn - 1
      );
    } else if (currentLine > 0) {
      // 移动到上一行的末尾
      const content = selectedTask.content || '';
      const lines = content.split('\n');
      const newLine = currentLine - 1;
      const newColumn = lines[newLine]?.length || 0;
      this.updateCursorPosition(selectedTask.id, newLine, newColumn);
    }
  }

  /**
   * 向右移动光标
   */
  moveCursorRight(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask || selectedTask.status !== TaskState.CONTENT_NAVIGATION) {
      return;
    }

    const content = selectedTask.content || '';
    const lines = content.split('\n');
    const currentLine = selectedTask.cursorLine || 0;
    const currentColumn = selectedTask.cursorColumn || 0;
    const lineLength = lines[currentLine]?.length || 0;

    if (currentColumn < lineLength) {
      this.updateCursorPosition(
        selectedTask.id,
        currentLine,
        currentColumn + 1
      );
    } else if (currentLine < lines.length - 1) {
      // 移动到下一行的开头
      this.updateCursorPosition(selectedTask.id, currentLine + 1, 0);
    }
  }

  /**
   * 移动光标到行首
   */
  moveCursorToLineStart(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask || selectedTask.status !== TaskState.CONTENT_NAVIGATION) {
      return;
    }

    const currentLine = selectedTask.cursorLine || 0;
    this.updateCursorPosition(selectedTask.id, currentLine, 0);
  }

  /**
   * 移动光标到行尾
   */
  moveCursorToLineEnd(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask || selectedTask.status !== TaskState.CONTENT_NAVIGATION) {
      return;
    }

    const content = selectedTask.content || '';
    const lines = content.split('\n');
    const currentLine = selectedTask.cursorLine || 0;
    const lineLength = lines[currentLine]?.length || 0;

    this.updateCursorPosition(selectedTask.id, currentLine, lineLength);
  }

  /**
   * 移动光标到第一行
   */
  moveCursorToFirstLine(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask || selectedTask.status !== TaskState.CONTENT_NAVIGATION) {
      return;
    }

    const currentColumn = selectedTask.cursorColumn || 0;
    const content = selectedTask.content || '';
    const lines = content.split('\n');
    const newColumn = Math.min(currentColumn, lines[0]?.length || 0);

    this.updateCursorPosition(selectedTask.id, 0, newColumn);
  }

  /**
   * 移动光标到最后一行
   */
  moveCursorToLastLine(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask || selectedTask.status !== TaskState.CONTENT_NAVIGATION) {
      return;
    }

    const content = selectedTask.content || '';
    const lines = content.split('\n');
    const lastLine = Math.max(0, lines.length - 1);
    const currentColumn = selectedTask.cursorColumn || 0;
    const newColumn = Math.min(currentColumn, lines[lastLine]?.length || 0);

    this.updateCursorPosition(selectedTask.id, lastLine, newColumn);
  }


  /**
   * 更新光标位置
   */
  updateCursorPosition(taskId: number, line: number, column: number): void {
    const state = this.getState();
    const tasks = [...state.tasks];
    const taskIndex = tasks.findIndex((task) => task.id === taskId);

    if (taskIndex >= 0) {
      tasks[taskIndex] = { ...tasks[taskIndex] };
      tasks[taskIndex].cursorLine = line;
      tasks[taskIndex].cursorColumn = column;

      this.updateState({
        tasks,
        cursorPosition: { line, column },
      });

      logger.debug(
        'CursorManager',
        `Updated cursor position for task ${taskId}: line=${line}, column=${column}`
      );
    }
  }
}
