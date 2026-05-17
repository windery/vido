/**
 * 重构后的键盘管理器
 * 使用模块化的处理器架构，实现更清晰的键盘事件处理
 */

import { ApplicationStateManager } from '../core/application-state-manager';
import { KeyboardHandler } from './keyboard-handler';
import { logger } from '../../utils/logger';
import { EditorMode } from '../editor';
import { TaskDataManager } from '../core/task-data-manager';
import {
  CommandModeHandler,
  TitleEditModeHandler,
  ContentNavigationModeHandler,
  ContentEditModeHandler,
  LastLineModeHandler,
  HelpModeHandler,
} from './index';

// 导入全局TaskDataManager实例
let globalTaskDataManager: TaskDataManager | null = null;

async function getGlobalTaskDataManager(): Promise<TaskDataManager> {
  if (!globalTaskDataManager) {
    // 动态导入useTaskState来避免循环依赖
    const { useTaskState } = await import(
      '../../composables/use-task-state'
    );
    const state = useTaskState();
    globalTaskDataManager = state.taskDataManager;
  }
  return globalTaskDataManager;
}

export class KeyboardManager {
  private keyboardHandler: KeyboardHandler;
  private stateManager: ApplicationStateManager;
  private taskDataManager: TaskDataManager;

  // 模式处理器
  private commandModeHandler: CommandModeHandler;
  private titleEditModeHandler: TitleEditModeHandler;
  private contentNavigationModeHandler: ContentNavigationModeHandler;
  private contentEditModeHandler: ContentEditModeHandler;
  private lastLineModeHandler: LastLineModeHandler;
  private helpModeHandler: HelpModeHandler;

  constructor() {
    this.keyboardHandler = new KeyboardHandler();
    this.taskDataManager = new TaskDataManager();
    this.stateManager = this.taskDataManager;

    this.commandModeHandler = new CommandModeHandler();
    this.titleEditModeHandler = new TitleEditModeHandler(this.keyboardHandler);
    this.contentNavigationModeHandler = new ContentNavigationModeHandler(
      this.keyboardHandler
    );
    this.contentEditModeHandler = new ContentEditModeHandler();
    this.lastLineModeHandler = new LastLineModeHandler();
    this.helpModeHandler = new HelpModeHandler();

    this.initializeTaskDataManager();
  }

  private async initializeTaskDataManager(): Promise<void> {
    try {
      this.taskDataManager = await getGlobalTaskDataManager();
      this.stateManager = this.taskDataManager;
    } catch (error) {
      logger.error('KeyboardManager', 'Failed to initialize TaskDataManager', {
        error,
      });
    }
  }

  handleKeyEvent(event: KeyboardEvent): void {
    const currentState = this.stateManager.getState();
    const activeElement = document.activeElement;
    const isInInputField =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement;

    if (currentState.isHelpVisible) {
      this.handleHelpModeKey(event);
      return;
    }

    this.handleKeyBasedOnEditorMode(event, currentState, isInInputField);
  }

  private handleKeyBasedOnEditorMode(
    event: KeyboardEvent,
    currentState: any,
    isInInputField: boolean
  ): void {
    const key = event.key;
    const { editorMode } = currentState;

    switch (editorMode) {
      case EditorMode.COMMAND:
        this.commandModeHandler.handleKey(
          event, key, this.taskDataManager, isInInputField
        );
        break;

      case EditorMode.TITLE_EDIT:
        this.titleEditModeHandler.handleKey(
          event, key, this.taskDataManager, isInInputField
        );
        break;

      case EditorMode.CONTENT_NAVIGATION:
        this.contentNavigationModeHandler.handleKey(
          event, key, this.taskDataManager, isInInputField
        );
        break;

      case EditorMode.CONTENT_EDIT:
        this.contentEditModeHandler.handleKey(
          event, key, this.taskDataManager, isInInputField
        );
        break;

      case EditorMode.LAST_LINE:
        this.lastLineModeHandler.handleKey(
          event, key, this.taskDataManager, isInInputField
        );
        break;

      case EditorMode.TASK_CONFIG:
        // TASK_CONFIG 模式所有键由组件层处理
        break;

      default:
        logger.warn('KeyboardManager', `Unknown editor mode: ${editorMode}`);
    }
  }

  private handleHelpModeKey(event: KeyboardEvent): void {
    this.helpModeHandler.handleKey(event, this.taskDataManager);
  }

  dispose(): void {
    logger.info('KeyboardManager', 'Resources cleaned up');
  }
}

let keyboardManagerInstance: KeyboardManager | null = null;

export function getKeyboardManager(): KeyboardManager {
  if (!keyboardManagerInstance) {
    keyboardManagerInstance = new KeyboardManager();
  }
  return keyboardManagerInstance;
}

export function initializeKeyboardManager(): void {
  const keyboardManager = getKeyboardManager();

  try {
    document.addEventListener('keydown', (event) => {
      keyboardManager.handleKeyEvent(event);
    });
  } catch (error) {
    logger.error('KeyboardManager', 'Failed to bind document keydown listener', { error });
  }

  logger.info('KeyboardManager', 'Initialized');
}
