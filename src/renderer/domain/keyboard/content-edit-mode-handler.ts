/**
 * 内容编辑模式处理器
 */

import { ModeHandler } from './base-handler';
import { TaskDataManager } from '../core/task-data-manager';

export class ContentEditModeHandler implements ModeHandler {
  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: TaskDataManager,
    _isInInputField: boolean
  ): boolean {
    if (key === 'Escape') {
      event.preventDefault();
      // 从内容编辑模式退出到内容导航模式
      this.saveCursorPosition();

      // 获取当前活动的textarea
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLTextAreaElement) {
        // 立即设置为readonly状态，但保持焦点，避免光标闪烁
        activeElement.readOnly = true;
        activeElement.classList.add('content-nav');
      }

      // 进行状态转换
      taskDataManager.transition('Escape');

      return true;
    }
    return false; // 其他按键让输入框正常处理
  }

  private saveCursorPosition(): void {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLTextAreaElement) {
      const selectionStart = activeElement.selectionStart;
      const content = activeElement.value;

      const lines = content.substring(0, selectionStart).split('\n');
      const cursorLine = lines.length - 1;
      const cursorColumn = lines[lines.length - 1].length;

      // 触发保存光标位置事件
      const event = new CustomEvent('save-cursor-position', {
        detail: {
          taskId: parseInt(
            activeElement
              .closest('[data-task-id]')
              ?.getAttribute('data-task-id') || '0'
          ),
          cursorLine,
          cursorColumn,
        },
      });
      document.dispatchEvent(event);
    }
  }

  dispose(): void {}

  private blurInputFields(): void {
    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement
    ) {
      activeElement.blur();
    }
  }
}
