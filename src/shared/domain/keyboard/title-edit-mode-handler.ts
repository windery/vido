/**
 * 标题编辑模式处理器
 */

import { ModeHandler } from './base-handler';
import { TaskDataManager } from '../core/task-data-manager';
import { KeyboardHandler, KeyboardContext } from '../keyboard-handler';
import { EditorMode } from '../editor';

export class TitleEditModeHandler implements ModeHandler {
  constructor(private keyboardHandler: KeyboardHandler) {}

  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: TaskDataManager,
    isInInputField: boolean
  ): boolean {
    // 检查是否处于输入法组合状态
    const isComposing = this.isIMEComposing(event);

    // 直接处理标题编辑模式下的特殊键
    if (key === 'Escape' || (key === 'Enter' && !isComposing)) {
      event.preventDefault();
      // 从标题编辑模式退出到命令模式
      taskDataManager.transition(key);
      // 保存任务到文件
      taskDataManager.saveTasks();
      this.blurInputFields();
      return true;
    }

    // 如果是Enter键但处于输入法组合状态，让输入法处理
    if (key === 'Enter' && isComposing) {
      return false; // 不处理，让输入法完成组合
    }

    // 对于普通字符输入，如果在输入框中，让事件自然传播，不要拦截
    if (isInInputField && this.isRegularCharacter(key)) {
      return false; // 不处理，让浏览器默认行为处理
    }

    // 对于其他键，使用KeyboardHandler处理
    const context: KeyboardContext = {
      editorMode: EditorMode.TITLE_EDIT,
      taskState: taskDataManager.getState().taskState,
      isInInputField: isInInputField,
      targetTagName: 'INPUT',
      keySequence: '',
    };

    const result = this.keyboardHandler.handleKeyPress(key, context);
    if (result.handled) {
      if (result.preventDefault) {
        event.preventDefault();
      }
      // 执行相应的操作
      this.executeAction(result.action, taskDataManager, context);
      return true;
    }
    return false;
  }

  private executeAction(
    action: string | undefined,
    taskDataManager: TaskDataManager,
    _context: KeyboardContext
  ): void {
    if (!action) return;

    switch (action) {
      case 'exit_to_command':
        // 从标题编辑模式退出到命令模式
        taskDataManager.transition('Escape');
        this.blurInputFields();
        break;
      // 其他操作...
    }
  }

  private isRegularCharacter(key: string): boolean {
    // 检查是否是普通的可输入字符（长度为1的字符，排除特殊键）
    return (
      key.length === 1 &&
      !['Escape', 'Enter', 'Tab', 'Backspace', 'Delete'].includes(key)
    );
  }

  /**
   * 检查是否处于输入法组合状态
   * 通过KeyboardEvent的isComposing属性来判断
   */
  private isIMEComposing(event: KeyboardEvent): boolean {
    // isComposing属性表示当前是否处于输入法组合状态
    // 在中文输入法输入拼音时，isComposing为true
    // 当用户按回车确认拼音输入时，isComposing仍为true，直到组合完成
    return event.isComposing || false;
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
}
