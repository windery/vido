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
   * 移动到下一个词首 (w)
   */
  moveCursorWordForward(): void {
    const task = this.getSelectedNavTask();
    if (!task) return;
    const { content, cursorLine: line, cursorColumn: col } = task;
    const lines = (content || '').split('\n');
    const currentLine = line || 0;
    const currentCol = col || 0;

    // 查找当前行之后第一个词边界
    const pos = this.findNextWordStart(lines, currentLine, currentCol);
    if (pos) {
      this.updateCursorPosition(task.id, pos.line, pos.col);
    }
  }

  /**
   * 移动到上一个词首 (b)
   */
  moveCursorWordBackward(): void {
    const task = this.getSelectedNavTask();
    if (!task) return;
    const { content, cursorLine: line, cursorColumn: col } = task;
    const lines = (content || '').split('\n');
    const currentLine = line || 0;
    const currentCol = col || 0;

    const pos = this.findPrevWordStart(lines, currentLine, currentCol);
    if (pos) {
      this.updateCursorPosition(task.id, pos.line, pos.col);
    }
  }

  /**
   * 移动到当前/下一个词尾 (e)
   */
  moveCursorWordEnd(): void {
    const task = this.getSelectedNavTask();
    if (!task) return;
    const { content, cursorLine: line, cursorColumn: col } = task;
    const lines = (content || '').split('\n');
    const currentLine = line || 0;
    const currentCol = col || 0;

    const pos = this.findNextWordEnd(lines, currentLine, currentCol);
    if (pos) {
      this.updateCursorPosition(task.id, pos.line, pos.col);
    }
  }

  private getSelectedNavTask(): { id: number; content: string; cursorLine?: number; cursorColumn?: number } | null {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);
    if (!selectedTask || selectedTask.status !== TaskState.CONTENT_NAVIGATION) {
      return null;
    }
    return selectedTask;
  }

  private findNextWordStart(lines: string[], line: number, col: number): { line: number; col: number } | null {
    // 先跳过当前词的剩余部分
    let l = line;
    let c = col;
    const currentLine = lines[l] || '';
    // 如果当前字符不是空白，跳到当前词尾
    if (c < currentLine.length && currentLine[c] !== ' ') {
      while (c < currentLine.length && currentLine[c] !== ' ') c++;
      // 跳过空白
      while (c < currentLine.length && currentLine[c] === ' ') c++;
      if (c < currentLine.length) return { line: l, col: c };
      // 当前行找不到，继续下一行
      l++;
    } else {
      // 当前位置是空白或行尾，跳过空白找下一个词
      while (c < currentLine.length && currentLine[c] === ' ') c++;
      if (c < currentLine.length) return { line: l, col: c };
      l++;
    }
    // 跨行查找
    for (; l < lines.length; l++) {
      const ln = lines[l];
      for (c = 0; c < ln.length; c++) {
        if (ln[c] !== ' ') return { line: l, col: c };
      }
    }
    return null;
  }

  private findPrevWordStart(lines: string[], line: number, col: number): { line: number; col: number } | null {
    let l = line;
    let c = col - 1;
    // 跳过当前位置之前的空白
    while (l >= 0) {
      const ln = lines[l] || '';
      while (c >= 0 && ln[c] === ' ') c--;
      if (c < 0) {
        l--;
        c = (lines[l] || '').length - 1;
        continue;
      }
      // 找到词尾，回退到词首
      while (c >= 0 && ln[c] !== ' ') c--;
      const start = c + 1;
      if (start < ln.length && ln[start] !== ' ') {
        return { line: l, col: start };
      }
      c--;
    }
    return null;
  }

  private findNextWordEnd(lines: string[], line: number, col: number): { line: number; col: number } | null {
    let l = line;
    let c = col;
    const currentLine = lines[l] || '';

    // 如果在词中或词首：跳到当前词尾
    if (c < currentLine.length && currentLine[c] !== ' ') {
      while (c < currentLine.length && currentLine[c] !== ' ') c++;
      // 如果下一个字符存在且不是空白（即紧挨着下一个词），或者已经在行尾
      // vim e 行为：在词中则到当前词尾
      return { line: l, col: c - 1 };
    }

    // 在空白或行尾：跳到下一个词的词尾
    while (c < currentLine.length && currentLine[c] === ' ') c++;
    if (c < currentLine.length) {
      while (c < currentLine.length && currentLine[c] !== ' ') c++;
      return { line: l, col: c - 1 };
    }

    // 跨行到下一个有内容的行
    for (l = l + 1; l < lines.length; l++) {
      const ln = lines[l];
      for (c = 0; c < ln.length; c++) {
        if (ln[c] !== ' ') {
          while (c < ln.length && ln[c] !== ' ') c++;
          return { line: l, col: c - 1 };
        }
      }
    }
    return null;
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
