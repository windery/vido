/**
 * 标题编辑模式处理器
 */

import { ModeHandler } from './base-handler';
import { TaskDataManager } from '../core/task-data-manager';

export class TitleEditModeHandler implements ModeHandler {
  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: TaskDataManager,
    isInInputField: boolean
  ): boolean {
    const isComposing = event.isComposing || false;

    if (key === 'Escape' || (key === 'Enter' && !isComposing)) {
      event.preventDefault();
      taskDataManager.transition(key);
      taskDataManager.saveTasks();
      this.blurInputFields();
      return true;
    }

    if (key === 'Enter' && isComposing) {
      return false;
    }

    if (isInInputField && key.length === 1) {
      return false;
    }

    return false;
  }

  dispose(): void {}

  private blurInputFields(): void {
    const el = document.activeElement;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.blur();
    }
  }
}
