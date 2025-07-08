/**
 * 命令模式处理器
 */

import { ModeHandler } from './base-handler';
import { TaskDataManager } from '../core/task-data-manager';
import { logger } from '../../../renderer/utils/logger';

export class CommandModeHandler implements ModeHandler {
  private keySequence: string = '';
  private keySequenceTimeout: NodeJS.Timeout | null = null;

  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: TaskDataManager,
    isInInputField: boolean
  ): boolean {
    // 在输入框中的特殊处理
    if (isInInputField) {
      if (key === 'Escape') {
        event.preventDefault();
        this.blurInputFields();
        return true;
      }
      return false; // 其他按键让输入框正常处理
    }

    const currentState = taskDataManager.getState();
    const selectedTaskId = currentState.selectedTaskId;

    // 全局命令模式按键处理
    switch (key) {
      case 'Escape':
        // 检查是否有活跃的搜索状态需要清除
        if (
          currentState.lastlineContent &&
          currentState.lastlineContent.startsWith('/')
        ) {
          event.preventDefault();
          taskDataManager.transition('Escape');
          return true;
        }
        break;
      case 'j':
        event.preventDefault();
        taskDataManager.selectNext();
        this.scrollToSelectedTask();
        return true;
      case 'k':
        event.preventDefault();
        taskDataManager.selectPrevious();
        this.scrollToSelectedTask();
        return true;
      case 'i':
        if (selectedTaskId) {
          event.preventDefault();
          taskDataManager.transition('i');
          taskDataManager.startContentNavigation();
          this.focusContentArea(selectedTaskId);
          return true;
        }
        break;
      case 'Enter':
        if (selectedTaskId) {
          event.preventDefault();
          taskDataManager.transition('Enter');
          taskDataManager.startTitleEditing();
          return true;
        }
        break;
      case ':':
        event.preventDefault();
        taskDataManager.transition(':');
        this.focusCommandInput();
        return true;
      case '/':
        event.preventDefault();
        taskDataManager.transition('/');
        this.focusSearchInput();
        return true;
      case '?':
        event.preventDefault();
        taskDataManager.toggleHelp();
        return true;
      case ' ':
        if (selectedTaskId) {
          event.preventDefault();
          taskDataManager.toggleTaskCompletion();
          return true;
        }
        break;
      case 'G':
        event.preventDefault();
        taskDataManager.goToLast();
        this.scrollToSelectedTask();
        return true;
      case 'o': {
        event.preventDefault();
        logger.info('CommandModeHandler', 'o key pressed, creating new task');

        const newTask = taskDataManager.createNewTask('', true);
        logger.info('CommandModeHandler', `created task: ${newTask.id}`);

        // 状态转换到标题编辑模式
        const result = taskDataManager.transition('Enter');
        logger.info('CommandModeHandler', 'transition result', {
          success: result.success,
          error: result.error,
        });

        // 确保启动标题编辑
        taskDataManager.startTitleEditing();
        logger.info('CommandModeHandler', 'startTitleEditing called');

        return true;
      }
      case 'O': {
        event.preventDefault();
        logger.info(
          'CommandModeHandler',
          'O key pressed, creating new task above'
        );

        const newTask = taskDataManager.createNewTask('', false);
        logger.info('CommandModeHandler', `created task above: ${newTask.id}`);

        // 状态转换到标题编辑模式
        const result = taskDataManager.transition('Enter');
        logger.info('CommandModeHandler', 'transition result', {
          success: result.success,
          error: result.error,
        });

        // 确保启动标题编辑
        taskDataManager.startTitleEditing();
        logger.info('CommandModeHandler', 'startTitleEditing called');

        return true;
      }
      case 'g':
        // 处理gg序列
        this.keySequence += key;
        if (this.keySequence === 'gg') {
          event.preventDefault();
          this.resetKeySequence();
          taskDataManager.goToFirst();
          this.scrollToSelectedTask();
          return true;
        }
        // 等待第二个g，设置超时
        this.setKeySequenceTimeout();
        event.preventDefault();
        return true;
      case 'd':
        // 处理dd序列（删除任务）
        this.keySequence += key;
        if (this.keySequence === 'dd') {
          event.preventDefault();
          this.resetKeySequence();
          taskDataManager.deleteSelectedTask();
          return true;
        }
        // 等待第二个d，设置超时
        this.setKeySequenceTimeout();
        event.preventDefault();
        return true;
      case 'y':
        // 处理yy序列（复制任务）
        this.keySequence += key;
        if (this.keySequence === 'yy') {
          event.preventDefault();
          this.resetKeySequence();
          taskDataManager.copySelectedTask();
          return true;
        }
        // 等待第二个y，设置超时
        this.setKeySequenceTimeout();
        event.preventDefault();
        return true;
      case 'c':
        // 处理cc序列（配置任务）
        this.keySequence += key;
        if (this.keySequence === 'cc') {
          event.preventDefault();
          this.resetKeySequence();
          taskDataManager.showTaskConfig();
          return true;
        }
        // 等待第二个c，设置超时
        this.setKeySequenceTimeout();
        event.preventDefault();
        return true;
      case 'p':
        // 粘贴任务
        event.preventDefault();
        this.resetKeySequence();
        taskDataManager.pasteTask();
        return true;
      default:
        // 对于不匹配的键，如果有键序列则重置，否则不处理
        if (this.keySequence.length > 0) {
          this.resetKeySequence();
          return true; // 消费这个键，因为它打断了序列
        }
        return false;
    }

    return false;
  }

  private resetKeySequence(): void {
    this.keySequence = '';
    if (this.keySequenceTimeout) {
      clearTimeout(this.keySequenceTimeout);
      this.keySequenceTimeout = null;
    }
  }

  private setKeySequenceTimeout(): void {
    if (this.keySequenceTimeout) {
      clearTimeout(this.keySequenceTimeout);
    }
    this.keySequenceTimeout = setTimeout(() => {
      this.resetKeySequence();
    }, 1000); // 1秒超时
  }

  private blurInputFields(): void {
    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement
    ) {
      activeElement.blur();
    }
  }

  private scrollToSelectedTask(): void {
    setTimeout(() => {
      (window as any).scrollToSelectedTask?.();
    }, 10);
  }

  private focusContentArea(selectedTaskId: number): void {
    setTimeout(() => {
      const contentArea = document.querySelector(
        `[data-task-id="${selectedTaskId}"] .content-editor`
      );
      if (contentArea instanceof HTMLTextAreaElement) {
        contentArea.focus();
      }
    }, 50);
  }

  private focusCommandInput(): void {
    setTimeout(() => {
      const commandInput = document.querySelector('.command-input');
      if (commandInput instanceof HTMLInputElement) {
        commandInput.focus();
      }
    }, 50);
  }

  private focusSearchInput(): void {
    setTimeout(() => {
      const searchInput = document.querySelector('.lastline-input');
      if (searchInput instanceof HTMLInputElement) {
        searchInput.focus();
      }
    }, 50);
  }
}
