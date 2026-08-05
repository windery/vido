/**
 * 内容导航模式处理器
 * vim 风格光标移动：hjkl、w/b/e 词导航、0/$ 行首尾、gg/G 首尾行
 * vim 风格编辑：x/X/dw/db/de/d$/d0/dd/dgg/dG、cw/cc/c$、yy/yw/y$、p/P、
 * r{char}、~、J、u/Ctrl+R、A/I/O、i/a/o
 */

import { ModeHandler } from './base-handler';
import { Store } from '../state/store';
import { nextTick } from 'vue';
import { logger } from '../../utils/logger';

type Op = 'd' | 'c' | 'y';

export class ContentNavigationModeHandler implements ModeHandler {
  private keySequence = '';
  private pendingOp: Op | null = null;
  private pendingR = false;

  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: Store,
    _isInInputField: boolean
  ): boolean {
    // r{char}：等待替换字符
    if (this.pendingR) {
      if (key.length === 1 && !['Shift', 'Control', 'Alt', 'Meta'].includes(key)) {
        event.preventDefault();
        taskDataManager.replaceCharAtCursor(key);
        this.pendingR = false;
        return true;
      }
      this.pendingR = false; // 非法键取消 r，不再处理本键
      return true;
    }

    // 操作符（d/c/y）等待 motion
    if (this.pendingOp) {
      const handled = this.handleOperatorMotion(event, key, taskDataManager);
      if (handled) return true;
      this.pendingOp = null; // 非法 motion，取消操作符，继续按普通键处理
    }

    switch (key) {
      case 'Escape':
        event.preventDefault();
        this.keySequence = '';
        this.pendingOp = null;
        taskDataManager.transition('Escape');
        this.blurInputFields();
        return true;

      // ============ 进入编辑 ============
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

      case 'A':
        // 行尾追加
        event.preventDefault();
        taskDataManager.transition('a');
        taskDataManager.moveCursorToLineEnd();
        this.enableContentEditing(taskDataManager);
        return true;

      case 'I':
        // 行首插入
        event.preventDefault();
        taskDataManager.transition('i');
        taskDataManager.moveCursorToLineStart();
        this.enableContentEditing(taskDataManager);
        return true;

      case 'O':
        // 上方插入新行
        event.preventDefault();
        taskDataManager.insertLineAbove();
        taskDataManager.transition('o');
        this.enableContentEditing(taskDataManager);
        return true;

      // ============ 光标移动 ============
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

      case 'ArrowUp':
        event.preventDefault();
        taskDataManager.moveCursorUp();
        return true;

      case 'ArrowDown':
        event.preventDefault();
        taskDataManager.moveCursorDown();
        return true;

      case 'ArrowLeft':
        event.preventDefault();
        taskDataManager.moveCursorLeft();
        return true;

      case 'ArrowRight':
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

      // ============ 编辑操作 ============
      case 'x':
        event.preventDefault();
        taskDataManager.deleteCharAtCursor();
        return true;

      case 'X':
        event.preventDefault();
        taskDataManager.deleteCharBeforeCursor();
        return true;

      case '~':
        event.preventDefault();
        taskDataManager.swapCaseAtCursor();
        return true;

      case 'J':
        event.preventDefault();
        taskDataManager.mergeLineBelow();
        return true;

      case 'u':
        event.preventDefault();
        taskDataManager.undo();
        return true;

      case 'r':
        if (event.ctrlKey) {
          event.preventDefault();
          taskDataManager.redo();
          return true;
        }
        event.preventDefault();
        this.pendingR = true;
        return true;

      case 'p':
        event.preventDefault();
        taskDataManager.pasteAfter();
        return true;

      case 'P':
        event.preventDefault();
        taskDataManager.pasteBefore();
        return true;

      // 操作符前缀（vim operator + motion）
      case 'd':
      case 'c':
      case 'y':
        event.preventDefault();
        this.pendingOp = key as Op;
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

  /** 操作符 + motion 解析：dw/db/de/d$/d0/dd/dgg/dG（c/y 同构） */
  private handleOperatorMotion(event: KeyboardEvent, key: string, tdm: Store): boolean {
    const op = this.pendingOp!;
    // gg 双键 motion
    if (key === 'g' && this.keySequence === '') {
      this.keySequence = 'g';
      setTimeout(() => { this.keySequence = ''; }, 1000);
      return true;
    }
    const isGg = key === 'g' && this.keySequence === 'g';
    this.keySequence = '';

    let action: string;
    if (key === op) action = 'line'; // dd/cc/yy
    else if (isGg) action = 'toFirstLine';
    else if (key === 'w') action = 'wordForward';
    else if (key === 'b') action = 'wordBackward';
    else if (key === 'e') action = 'wordEnd';
    else if (key === '$') action = 'toLineEnd';
    else if (key === '0') action = 'toLineStart';
    else if (key === 'G') action = 'toLastLine';
    else return false;

    event.preventDefault();
    this.pendingOp = null;
    if (op === 'y') {
      this.applyCopy(tdm, action);
    } else {
      this.applyDelete(tdm, action);
      if (op === 'c') {
        // c = 修改：删除后进入编辑态
        tdm.transition('i');
        this.enableContentEditing(tdm);
      }
    }
    return true;
  }

  private applyDelete(tdm: Store, action: string): void {
    switch (action) {
      case 'wordForward': tdm.deleteWordForward(); break;
      case 'wordBackward': tdm.deleteWordBackward(); break;
      case 'wordEnd': tdm.deleteWordEnd(); break;
      case 'toLineEnd': tdm.deleteToLineEnd(); break;
      case 'toLineStart': tdm.deleteToLineStart(); break;
      case 'toFirstLine': tdm.deleteToFirstLine(); break;
      case 'toLastLine': tdm.deleteToLastLine(); break;
      case 'line': tdm.deleteLineAtCursor(); break;
    }
  }

  private applyCopy(tdm: Store, action: string): void {
    switch (action) {
      case 'wordForward': tdm.copyWord(); break;
      case 'toLineEnd': tdm.copyToLineEnd(); break;
      case 'line': tdm.copyLine(); break;
    }
  }

  dispose(): void {
    this.keySequence = '';
    this.pendingOp = null;
    this.pendingR = false;
  }

  private enableContentEditing(taskDataManager: Store): void {
    const state = taskDataManager.getTaskDataState();
    const taskId = state.selectedTaskId;
    if (!taskId) return;

    const task = state.tasks.find((t: any) => t.selected);
    const cursorLine = task?.cursorLine ?? 0;
    const cursorCol = task?.cursorColumn ?? 0;
    const rawContent = task?.content || '';

    logger.debug('ContentNavigationModeHandler', 'enableContentEditing', { taskId, cursorLine, cursorCol, contentLen: rawContent.length });

    // 等 Vue 完成 DOM 更新后再操作 textarea，避免 :value 绑定覆盖我们的设置
    nextTick(() => {
      setTimeout(() => {
        const el = document.querySelector(`[data-task-id="${taskId}"] .content-editor`);
        if (!(el instanceof HTMLTextAreaElement)) {
          logger.warn('ContentNavigationModeHandler', `enableContentEditing: textarea not found for task ${taskId}`);
          return;
        }

        // 恢复原始内容
        el.value = rawContent;
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
      }, 0);
    });
  }

  private moveToAppendPosition(taskDataManager: Store): void {
    // vim a：光标右移一位（在光标后插入）；已在行尾则不动
    const state = taskDataManager.getTaskDataState();
    const task = state.tasks.find((t: any) => t.selected);
    if (!task) return;
    const lines = (task.content || '').split('\n');
    const lineLen = (lines[task.cursorLine || 0] || '').length;
    const col = Math.min((task.cursorColumn || 0) + 1, lineLen);
    taskDataManager.updateTaskCursorPosition(task.id, task.cursorLine, col);
  }

  private blurInputFields(): void {
    const el = document.activeElement;
    if (el instanceof HTMLElement) el.blur();
  }
}
