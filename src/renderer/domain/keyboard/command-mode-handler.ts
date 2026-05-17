/**
 * 命令模式处理器
 * 支持 vim 风格按键：hjkl 导航、数字前缀（3j/5k/2dd）、多键序列（dd/yy/gg/cc）
 */

import { ModeHandler } from './base-handler';
import { TaskDataManager } from '../core/task-data-manager';
import { logger } from '../../utils/logger';

export class CommandModeHandler implements ModeHandler {
  private keySequence = '';
  private keySequenceTimeout: ReturnType<typeof setTimeout> | null = null;
  private countPrefix = '';
  private scrollCallback: (() => void) | null = null;

  /** 注入滚动回调，替代 window 全局访问 */
  setScrollCallback(cb: () => void): void {
    this.scrollCallback = cb;
  }

  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: TaskDataManager,
    isInInputField: boolean
  ): boolean {
    if (isInInputField) {
      if (key === 'Escape') {
        event.preventDefault();
        this.blurInputFields();
        return true;
      }
      return false;
    }

    const currentState = taskDataManager.getState();
    const selectedTaskId = currentState.selectedTaskId;

    // 数字前缀累积：3j → 下移 3 个任务
    if (/^[1-9]\d*$/.test(key) && this.keySequence.length === 0) {
      this.countPrefix += key;
      event.preventDefault();
      return true;
    }

    const count = this.countPrefix ? parseInt(this.countPrefix, 10) : 1;

    switch (key) {
      case 'Escape':
        if (currentState.lastlineContent?.startsWith('/')) {
          event.preventDefault();
          taskDataManager.transition('Escape');
        }
        this.resetAll();
        return true;

      case 'j':
        event.preventDefault();
        this.repeatAction(() => taskDataManager.selectNext(), count);
        this.scrollToSelectedTask();
        this.resetAll();
        return true;

      case 'k':
        event.preventDefault();
        this.repeatAction(() => taskDataManager.selectPrevious(), count);
        this.scrollToSelectedTask();
        this.resetAll();
        return true;

      case 'i':
        if (selectedTaskId) {
          event.preventDefault();
          taskDataManager.transition('i');
          taskDataManager.startContentNavigation();
          this.focusContentArea(selectedTaskId);
        }
        this.resetAll();
        return true;

      case 'Enter':
        if (selectedTaskId) {
          event.preventDefault();
          taskDataManager.transition('Enter');
          taskDataManager.startTitleEditing();
        }
        this.resetAll();
        return true;

      case ':':
        event.preventDefault();
        taskDataManager.transition(':');
        this.focusCommandInput();
        this.resetAll();
        return true;

      case '/':
        event.preventDefault();
        taskDataManager.transition('/');
        this.focusSearchInput();
        this.resetAll();
        return true;

      case '?':
        event.preventDefault();
        taskDataManager.toggleHelp();
        this.resetAll();
        return true;

      case ' ':
        if (selectedTaskId) {
          event.preventDefault();
          taskDataManager.toggleTaskCompletion();
        }
        this.resetAll();
        return true;

      case 'G':
        event.preventDefault();
        taskDataManager.goToLast();
        this.scrollToSelectedTask();
        this.resetAll();
        return true;

      case 'o':
        event.preventDefault();
        this.repeatAction(() => {
          const task = taskDataManager.createNewTask('', true);
          taskDataManager.transition('Enter');
          taskDataManager.startTitleEditing();
          return task;
        }, count);
        this.resetAll();
        return true;

      case 'O':
        event.preventDefault();
        this.repeatAction(() => {
          const task = taskDataManager.createNewTask('', false);
          taskDataManager.transition('Enter');
          taskDataManager.startTitleEditing();
          return task;
        }, count);
        this.resetAll();
        return true;

      case 'g':
        this.keySequence += key;
        if (this.keySequence === 'gg') {
          event.preventDefault();
          taskDataManager.goToFirst();
          this.scrollToSelectedTask();
          this.resetAll();
          return true;
        }
        this.setKeySequenceTimeout();
        event.preventDefault();
        return true;

      case 'd':
        this.keySequence += key;
        if (this.keySequence === 'dd') {
          event.preventDefault();
          this.repeatAction(() => taskDataManager.deleteSelectedTask(), count);
          this.resetAll();
          return true;
        }
        this.setKeySequenceTimeout();
        event.preventDefault();
        return true;

      case 'y':
        this.keySequence += key;
        if (this.keySequence === 'yy') {
          event.preventDefault();
          taskDataManager.copySelectedTask();
          this.resetAll();
          return true;
        }
        this.setKeySequenceTimeout();
        event.preventDefault();
        return true;

      case 'c':
        this.keySequence += key;
        if (this.keySequence === 'cc') {
          event.preventDefault();
          this.resetAll();
          taskDataManager.toggleConfigPanel();
          return true;
        }
        this.setKeySequenceTimeout();
        event.preventDefault();
        return true;

      case 'p':
        event.preventDefault();
        this.repeatAction(() => taskDataManager.pasteTask(), count);
        this.resetAll();
        return true;

      default:
        if (this.keySequence.length > 0) {
          this.resetSequenceState();
          return true;
        }
        return false;
    }

    return false;
  }

  private repeatAction(action: () => unknown, count: number): void {
    for (let i = 0; i < count; i++) {
      action();
    }
  }

  private resetAll(): void {
    this.countPrefix = '';
    this.resetSequenceState();
  }

  private resetSequenceState(): void {
    this.keySequence = '';
    if (this.keySequenceTimeout) {
      clearTimeout(this.keySequenceTimeout);
      this.keySequenceTimeout = null;
    }
  }

  private setKeySequenceTimeout(): void {
    if (this.keySequenceTimeout) clearTimeout(this.keySequenceTimeout);
    this.keySequenceTimeout = setTimeout(() => this.resetSequenceState(), 1000);
  }

  dispose(): void {
    this.resetSequenceState();
    this.countPrefix = '';
    this.scrollCallback = null;
  }

  private scrollToSelectedTask(): void {
    if (this.scrollCallback) {
      setTimeout(() => this.scrollCallback?.(), 10);
    }
  }

  private focusContentArea(selectedTaskId: number): void {
    setTimeout(() => {
      const el = document.querySelector(`[data-task-id="${selectedTaskId}"] .content-editor`);
      if (el instanceof HTMLTextAreaElement) el.focus();
    }, 50);
  }

  private focusCommandInput(): void {
    setTimeout(() => {
      const el = document.querySelector('.command-input');
      if (el instanceof HTMLInputElement) el.focus();
    }, 50);
  }

  private focusSearchInput(): void {
    setTimeout(() => {
      const el = document.querySelector('.lastline-input');
      if (el instanceof HTMLInputElement) el.focus();
    }, 50);
  }

  private blurInputFields(): void {
    const el = document.activeElement;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.blur();
    }
  }
}
