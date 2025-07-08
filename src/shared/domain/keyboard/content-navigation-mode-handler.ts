/**
 * 内容导航模式处理器
 */

import { ModeHandler } from './base-handler';
import { TaskDataManager } from '../core/task-data-manager';
import { KeyboardHandler, KeyboardContext } from '../keyboard-handler';
import { EditorMode } from '../editor';
import { logger } from '../../../renderer/utils/logger';

export class ContentNavigationModeHandler implements ModeHandler {
  constructor(private keyboardHandler: KeyboardHandler) {}

  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: TaskDataManager,
    isInInputField: boolean
  ): boolean {
    // 直接处理 Escape 键退出到命令模式
    if (key === 'Escape') {
      event.preventDefault();
      // 从内容导航模式退出到命令模式
      taskDataManager.transition('Escape');
      this.blurInputFields();
      return true;
    }

    // 直接处理 i 键进入编辑模式
    if (key === 'i') {
      event.preventDefault();
      logger.info(
        'ContentNavigationModeHandler',
        'i key pressed, transitioning to edit mode'
      );

      // 从内容导航模式进入内容编辑模式
      const result = taskDataManager.transition('i');
      logger.info('ContentNavigationModeHandler', 'transition result', {
        success: result.success,
        error: result.error,
      });

      // 检查任务状态
      const currentState = taskDataManager.getTaskDataState();
      const selectedTask = currentState.tasks?.find((t: any) => t.selected);
      logger.info(
        'ContentNavigationModeHandler',
        'selected task after transition',
        {
          id: selectedTask?.id,
          status: selectedTask?.status,
          selected: selectedTask?.selected,
        }
      );

      this.enableContentEditing(taskDataManager);
      return true;
    }

    // 直接处理 a 键进入编辑模式（在当前位置后插入）
    if (key === 'a') {
      event.preventDefault();
      logger.info(
        'ContentNavigationModeHandler',
        'a key pressed, transitioning to edit mode (append)'
      );

      // 从内容导航模式进入内容编辑模式
      const result = taskDataManager.transition('a');
      logger.info('ContentNavigationModeHandler', 'transition result', {
        success: result.success,
        error: result.error,
      });

      // 将光标移动到当前位置的下一个字符（append模式）
      this.moveToAppendPosition(taskDataManager);
      this.enableContentEditing(taskDataManager);
      return true;
    }

    // 直接处理 o 键进入编辑模式（插入新行）
    if (key === 'o') {
      event.preventDefault();
      // 插入新行并进入编辑模式
      taskDataManager.insertNewLineBelow();
      // 状态转换到编辑模式
      taskDataManager.transition('o');
      this.enableContentEditing(taskDataManager);
      return true;
    }

    // 对于其他键，使用KeyboardHandler处理
    const context: KeyboardContext = {
      editorMode: EditorMode.CONTENT_NAVIGATION,
      taskState: taskDataManager.getState().taskState,
      isInInputField: isInInputField,
      targetTagName: 'TEXTAREA',
      keySequence: this.keyboardHandler.getCurrentKeySequence(),
    };

    const result = this.keyboardHandler.handleKeyPress(key, context);
    if (result.handled) {
      if (result.preventDefault) {
        event.preventDefault();
      }
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
      case 'move_cursor_up':
        taskDataManager.moveCursorUp();
        break;
      case 'move_cursor_down':
        taskDataManager.moveCursorDown();
        break;
      case 'move_cursor_left':
        taskDataManager.moveCursorLeft();
        break;
      case 'move_cursor_right':
        taskDataManager.moveCursorRight();
        break;
      case 'move_to_line_start':
        taskDataManager.moveCursorToLineStart();
        break;
      case 'move_to_line_end':
        taskDataManager.moveCursorToLineEnd();
        break;
      case 'move_to_first_line':
        taskDataManager.moveCursorToFirstLine();
        break;
      case 'move_to_last_line':
        taskDataManager.moveCursorToLastLine();
        break;
      case 'enter_edit':
        // 从内容导航模式进入内容编辑模式
        taskDataManager.transition('i');
        this.enableContentEditing(taskDataManager);
        break;
      case 'exit_to_command':
        // 从内容导航模式退出到命令模式
        taskDataManager.transition('Escape');
        this.blurInputFields();
        break;
      // 其他操作...
    }
  }

  private enableContentEditing(taskDataManager: TaskDataManager): void {
    const currentState = taskDataManager.getState();
    const selectedTaskId = currentState.selectedTaskId;
    if (selectedTaskId) {
      // 使用较短的setTimeout等待DOM更新完成
      setTimeout(() => {
        const contentArea = document.querySelector(
          `[data-task-id="${selectedTaskId}"] .content-editor`
        );
        logger.info(
          'ContentNavigationModeHandler',
          'enableContentEditing: found textarea',
          {
            found: !!contentArea,
            taskId: selectedTaskId,
          }
        );

        if (contentArea instanceof HTMLTextAreaElement) {
          logger.info(
            'ContentNavigationModeHandler',
            'textarea readonly before',
            { readOnly: contentArea.readOnly }
          );

          contentArea.removeAttribute('readonly');
          contentArea.readOnly = false;

          logger.info(
            'ContentNavigationModeHandler',
            'textarea readonly after',
            { readOnly: contentArea.readOnly }
          );

          // 确保textarea可见和可聚焦
          contentArea.style.display = 'block';
          contentArea.tabIndex = 0;

          contentArea.focus();

          // 将content-nav的光标位置转换为content-edit的光标位置
          const taskDataState = taskDataManager.getTaskDataState();
          const selectedTask = taskDataState.tasks?.find(
            (t: any) => t.selected
          );

          if (
            selectedTask &&
            selectedTask.cursorLine !== undefined &&
            selectedTask.cursorColumn !== undefined
          ) {
            const content = contentArea.value;
            const lines = content.split('\n');
            let charPosition = 0;

            // 计算到目标行的字符位置
            for (
              let i = 0;
              i < selectedTask.cursorLine && i < lines.length;
              i++
            ) {
              charPosition += lines[i].length + 1; // +1 for newline
            }

            // 加上目标行内的列位置
            if (selectedTask.cursorLine < lines.length) {
              const targetLine = lines[selectedTask.cursorLine] || '';
              const columnPosition = Math.min(
                selectedTask.cursorColumn,
                targetLine.length
              );
              charPosition += columnPosition;
            }

            // 设置光标位置（不选中字符，只设置光标）
            contentArea.setSelectionRange(charPosition, charPosition);

            logger.info(
              'ContentNavigationModeHandler',
              'Set cursor position for content editing',
              {
                cursorLine: selectedTask.cursorLine,
                cursorColumn: selectedTask.cursorColumn,
                charPosition: charPosition,
              }
            );
          }

          logger.info(
            'ContentNavigationModeHandler',
            'enableContentEditing focused',
            {
              activeElement: document.activeElement === contentArea,
            }
          );
        } else {
          logger.error(
            'ContentNavigationModeHandler',
            'textarea not found or not HTMLTextAreaElement'
          );
        }
      }, 5); // 使用5ms延迟，尽可能快
    }
  }

  /**
   * 将光标移动到当前位置的下一个字符（append模式）
   */
  private moveToAppendPosition(taskDataManager: TaskDataManager): void {
    const taskDataState = taskDataManager.getTaskDataState();
    const selectedTask = taskDataState.tasks?.find((t: any) => t.selected);

    if (selectedTask) {
      // 获取当前光标位置
      const currentLine = selectedTask.cursorLine || 0;
      const currentColumn = selectedTask.cursorColumn || 0;

      // 获取任务内容
      const content = selectedTask.content || '';
      const lines = content.split('\n');

      // 确保lines数组至少有一个元素（空行）
      if (lines.length === 0) {
        lines.push('');
      }

      if (currentLine < lines.length) {
        const line = lines[currentLine] || '';
        // 在append模式下，光标应该移动到当前位置的下一个字符
        // 但不能超过行的长度
        let newColumn;

        if (currentColumn >= line.length) {
          // 如果当前已经在行末，保持在行末
          newColumn = line.length;
        } else {
          // 否则移动到下一个字符位置
          newColumn = currentColumn + 1;
        }

        logger.info(
          'ContentNavigationModeHandler',
          'Moving cursor for append mode',
          {
            content: content,
            lineLength: line.length,
            from: { line: currentLine, column: currentColumn },
            to: { line: currentLine, column: newColumn },
          }
        );

        // 更新光标位置
        taskDataManager.updateTaskCursorPosition(
          selectedTask.id,
          currentLine,
          newColumn
        );
      }
    }
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
