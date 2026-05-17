/**
 * 内容导航模式处理器
 * vim 风格光标移动：hjkl、w/b/e 词导航、0/$ 行首尾、gg/G 首尾行
 */

import { ModeHandler } from './base-handler';
import { TaskDataManager } from '../core/task-data-manager';

export class ContentNavigationModeHandler implements ModeHandler {
  private keySequence = '';

  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: TaskDataManager,
    _isInInputField: boolean
  ): boolean {
    switch (key) {
      case 'Escape':
        event.preventDefault();
        taskDataManager.transition('Escape');
        this.blurInputFields();
        return true;

      case 'i':
        event.preventDefault();
        taskDataManager.transition('i');
        this.enableContentEditing(taskDataManager);
        return true;

      case 'a':
        event.preventDefault();
        taskDataManager.transition('a');
        this.moveToAppendPosition(taskDataManager);
        this.enableContentEditing(taskDataManager);
        return true;

      case 'o':
        event.preventDefault();
        taskDataManager.insertNewLineBelow();
        taskDataManager.transition('o');
        this.enableContentEditing(taskDataManager);
        return true;

      case 'j':
        event.preventDefault();
        taskDataManager.moveCursorDown();
        return true;

      case 'k':
        event.preventDefault();
        taskDataManager.moveCursorUp();
        return true;

      case 'h':
        event.preventDefault();
        taskDataManager.moveCursorLeft();
        return true;

      case 'l':
        event.preventDefault();
        taskDataManager.moveCursorRight();
        return true;

      case 'w':
        event.preventDefault();
        taskDataManager.moveCursorWordForward();
        return true;

      case 'b':
        event.preventDefault();
        taskDataManager.moveCursorWordBackward();
        return true;

      case 'e':
        event.preventDefault();
        taskDataManager.moveCursorWordEnd();
        return true;

      case '0':
        event.preventDefault();
        taskDataManager.moveCursorToLineStart();
        return true;

      case '$':
        event.preventDefault();
        taskDataManager.moveCursorToLineEnd();
        return true;

      case 'G':
        event.preventDefault();
        taskDataManager.moveCursorToLastLine();
        return true;

      case 'g':
        this.keySequence += key;
        if (this.keySequence === 'gg') {
          event.preventDefault();
          taskDataManager.moveCursorToFirstLine();
          this.keySequence = '';
          return true;
        }
        event.preventDefault();
        setTimeout(() => { this.keySequence = ''; }, 1000);
        return true;

      default:
        // 未绑定键，退出导航回 command 模式
        if (key.length === 1 && !['Shift', 'Control', 'Alt', 'Meta'].includes(key)) {
          event.preventDefault();
          taskDataManager.transition('Escape');
          this.blurInputFields();
          return true;
        }
        return false;
    }
  }

  dispose(): void {
    this.keySequence = '';
  }

  private enableContentEditing(taskDataManager: TaskDataManager): void {
    const state = taskDataManager.getTaskDataState();
    const taskId = state.selectedTaskId;
    if (!taskId) return;

    const task = state.tasks.find((t: any) => t.selected);
    const cursorLine = task?.cursorLine ?? 0;
    const cursorCol = task?.cursorColumn ?? 0;
    const rawContent = task?.content || '';

    setTimeout(() => {
      const el = document.querySelector(`[data-task-id="${taskId}"] .content-editor`);
      if (el instanceof HTMLTextAreaElement) {
        // 先恢复原始内容——CONTENT_NAVIGATION 模式下 textarea 被插入了光标占位符，
        // 如果不恢复，用 el.value 算出来的 offset 会偏移一位，导致覆盖字符
        el.value = rawContent;
        el.removeAttribute('readonly');
        el.readOnly = false;
        el.style.display = 'block';
        el.tabIndex = 0;
        el.focus();

        const lines = rawContent.split('\n');
        let offset = 0;
        for (let i = 0; i < cursorLine && i < lines.length; i++) {
          offset += lines[i].length + 1;
        }
        offset += Math.min(cursorCol, (lines[cursorLine] || '').length);
        el.setSelectionRange(offset, offset);
      }
    }, 5);
  }

  private moveToAppendPosition(taskDataManager: TaskDataManager): void {
    const state = taskDataManager.getTaskDataState();
    const task = state.tasks?.find((t: any) => t.selected);
    if (!task) return;

    const content = task.content || '';
    const lines = content.split('\n');
    if (lines.length === 0) lines.push('');
    const currentLine = task.cursorLine || 0;
    const line = lines[currentLine] || '';
    const currentCol = task.cursorColumn || 0;
    const newCol = currentCol >= line.length ? line.length : currentCol + 1;

    taskDataManager.updateTaskCursorPosition(task.id, currentLine, newCol);
  }

  private blurInputFields(): void {
    const el = document.activeElement;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.blur();
    }
  }
}
