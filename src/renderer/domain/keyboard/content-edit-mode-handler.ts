/**
 * 内容编辑模式处理器
 */

import { ModeHandler } from './base-handler';
import { Store } from '../state/store';

export class ContentEditModeHandler implements ModeHandler {
  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: Store,
    _isInInputField: boolean
  ): boolean {
    if (key === 'Escape') {
      event.preventDefault();
      // 从内容编辑模式退出到内容导航模式
      this.saveCursorPosition();

      // 获取当前活动的textarea
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLTextAreaElement) {
        // 保持可编辑使 caret 可见（readonly 元素不渲染光标）；块光标样式由 .content-nav 类提供
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
