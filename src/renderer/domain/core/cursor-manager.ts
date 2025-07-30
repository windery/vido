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
   * 开始内容导航模式
   */
  startContentNavigation(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask) {
      logger.warn('CursorManager', 'No task selected for content navigation');
      return;
    }

    // 更新任务状态为内容导航
    const tasks = [...state.tasks];
    const taskIndex = tasks.findIndex((task) => task.id === selectedTask.id);
    if (taskIndex >= 0) {
      tasks[taskIndex] = { ...tasks[taskIndex] };
      tasks[taskIndex].status = TaskState.CONTENT_NAVIGATION;

      // 设置初始光标位置
      if (tasks[taskIndex].cursorLine === undefined) {
        tasks[taskIndex].cursorLine = 0;
        tasks[taskIndex].cursorColumn = 0;
      }
    }

    this.updateState({
      tasks,
      editorMode: EditorMode.CONTENT_NAVIGATION,
      taskState: TaskState.CONTENT_NAVIGATION,
    });

    logger.info(
      'CursorManager',
      `Started content navigation for task ${selectedTask.id}`
    );
  }

  /**
   * 在光标位置开始编辑
   */
  startEditingAtCursor(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask) {
      logger.warn('CursorManager', 'No task selected for editing');
      return;
    }

    const tasks = [...state.tasks];
    const taskIndex = tasks.findIndex((task) => task.id === selectedTask.id);
    if (taskIndex >= 0) {
      tasks[taskIndex] = { ...tasks[taskIndex] };
      tasks[taskIndex].status = TaskState.CONTENT_EDITING;
    }

    this.updateState({
      tasks,
      editorMode: EditorMode.CONTENT_EDIT,
      taskState: TaskState.CONTENT_EDITING,
    });

    logger.info(
      'CursorManager',
      `Started editing at cursor for task ${selectedTask.id}`
    );
  }

  /**
   * 停止编辑
   */
  stopEditing(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask) {
      return;
    }

    const tasks = [...state.tasks];
    const taskIndex = tasks.findIndex((task) => task.id === selectedTask.id);
    if (taskIndex >= 0) {
      tasks[taskIndex] = { ...tasks[taskIndex] };
      tasks[taskIndex].status = TaskState.VIEWING;
    }

    this.updateState({
      tasks,
      editorMode: EditorMode.COMMAND,
      taskState: TaskState.VIEWING,
    });

    logger.info('CursorManager', `Stopped editing for task ${selectedTask.id}`);
  }

  /**
   * 退出内容导航模式
   */
  exitContentNavigation(): void {
    this.stopEditing();
  }

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
   * 在当前光标位置下方插入新行
   */
  insertNewLineBelow(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask) {
      return;
    }

    const content = selectedTask.content || '';
    const lines = content.split('\n');
    const currentLine = selectedTask.cursorLine || 0;

    // 在当前行下方插入空行
    lines.splice(currentLine + 1, 0, '');
    const newContent = lines.join('\n');

    const tasks = [...state.tasks];
    const taskIndex = tasks.findIndex((task) => task.id === selectedTask.id);
    if (taskIndex >= 0) {
      tasks[taskIndex] = { ...tasks[taskIndex] };
      tasks[taskIndex].content = newContent;
      tasks[taskIndex].cursorLine = currentLine + 1;
      tasks[taskIndex].cursorColumn = 0;
    }

    this.updateState({ tasks });
    logger.info(
      'CursorManager',
      `Inserted new line below for task ${selectedTask.id}`
    );
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
