/**
 * 内容导航模式处理器
 * vim 风格光标移动：hjkl、w/b/e 词导航、0/$ 行首尾、gg/G 首尾行
 * vim 风格编辑：x/X/dw/db/de/d$/d0/dd/dgg/dG、cw/cc/c$、yy/yw/y$、p/P、
 * r{char}、~、J、u/Ctrl+R、A/I/O、i/a/o
 * v/V/Ctrl+V 可视模式：v 字符、V 行、Ctrl+V 块，锚点↔光标选区，x/d 删除、y 复制、p/P 替换、c 删除后插入、Esc 退出
 * p/P：系统剪贴板优先（外部复制内容），无则回退内部 yank 缓冲
 */

import { ModeHandler } from './base-handler';
import { Store } from '../state/store';
import { nextTick } from 'vue';
import { logger } from '../../utils/logger';
import { readSystemClipboard } from '../../utils/clipboard';

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

    // 可视模式（v 字符 / V 行 / Ctrl+V 块）：x/d/y/c/p/Esc 作用于选区，移动键扩展选区（放行主 switch），
    // 其余键先退出可视模式再按普通键处理
    if (taskDataManager.getState().visual?.active) {
      const handled = this.handleVisualKey(event, key, taskDataManager);
      if (handled) return true;
    }

    switch (key) {
      case 'Escape':
        event.preventDefault();
        this.keySequence = '';
        this.pendingOp = null;
        taskDataManager.transition('Escape');
        this.blurInputFields();
        return true;

      // ? 打开完整键位参考（readonly textarea 聚焦时也生效；导航态保持）
      case '?':
        event.preventDefault();
        taskDataManager.toggleHelp('content');
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

      // vim 语义：Enter（normal 态）下移一行，不再误退出导航
      case 'Enter':
        event.preventDefault();
        taskDataManager.moveCursorDown();
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
        this.pasteKey(taskDataManager, false);
        return true;

      case 'P':
        event.preventDefault();
        this.pasteKey(taskDataManager, true);
        return true;

      // v：字符可视；Ctrl+V：可视块；V：行可视（锚点=当前光标，移动键扩展选区）
      case 'v':
        event.preventDefault();
        if (event.ctrlKey) taskDataManager.startVisual('block');
        else taskDataManager.startVisual('char');
        return true;

      case 'V':
        event.preventDefault();
        taskDataManager.startVisual('line');
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

  /** 可视模式按键：x/d 删除选区、y 复制、c 删除后插入、p/P 替换、Esc 仅退出可视；移动键返回 false 放行主 switch 扩展选区 */
  private handleVisualKey(event: KeyboardEvent, key: string, tdm: Store): boolean {
    switch (key) {
      case 'Escape':
        event.preventDefault();
        tdm.endVisual();
        return true;

      case 'x':
      case 'd':
        event.preventDefault();
        tdm.deleteVisual();
        return true;

      case 'y':
        event.preventDefault();
        tdm.copyVisual();
        return true;

      // vim 语义：可视选中时 p/P 用粘贴内容**替换**选区（系统剪贴板优先，回退内部 yank）
      case 'p':
      case 'P':
        event.preventDefault();
        this.pasteOverVisual(tdm);
        return true;

      case 'c':
        event.preventDefault();
        tdm.changeVisual();
        tdm.transition('i');
        this.enableContentEditing(tdm);
        return true;

      case '?':
        event.preventDefault();
        tdm.toggleHelp('content');
        return true;

      // 移动键：扩展选区（走主 switch 的移动逻辑）
      case 'j': case 'k': case 'h': case 'l': case 'Enter':
      case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight':
      case 'w': case 'b': case 'e': case '0': case '$': case 'G': case 'g':
        return false;

      default:
        // 未绑定键：退出可视模式后按普通键继续（不吞键）
        tdm.endVisual();
        return false;
    }
  }

  /** p/P：优先粘贴系统剪贴板（外部复制内容）；无系统剪贴板/读取失败/为空时回退内部 yank 缓冲 */
  private pasteKey(tdm: Store, before: boolean): void {
    const sys = readSystemClipboard();
    if (sys === null) {
      this.pasteInternal(tdm, before);
      return;
    }
    void sys
      .then((text) => {
        if (text) tdm.pasteTextRaw(text, before);
        else this.pasteInternal(tdm, before);
      })
      .catch(() => this.pasteInternal(tdm, before));
  }

  private pasteInternal(tdm: Store, before: boolean): void {
    if (before) tdm.pasteBefore();
    else tdm.pasteAfter();
  }

  /** 可视模式 p/P：删除选区后用粘贴文本原位替换（系统剪贴板优先，无/空则回退内部 yank；空文本 = 仅删除选区） */
  private pasteOverVisual(tdm: Store): void {
    const fallback = () => {
      const cb = tdm.getContentClipboard();
      tdm.replaceVisual(cb ? cb.text : '');
    };
    const sys = readSystemClipboard();
    if (sys === null) {
      fallback();
      return;
    }
    void sys
      .then((text) => {
        if (text) tdm.replaceVisual(text);
        else fallback();
      })
      .catch(fallback);
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
