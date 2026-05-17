/**
 * 键盘管理器
 * 根据编辑器模式将按键分发给对应的处理器
 */

import { ApplicationStateManager } from '../core/application-state-manager';
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

let globalTaskDataManager: TaskDataManager | null = null;

async function getGlobalTaskDataManager(): Promise<TaskDataManager> {
  if (!globalTaskDataManager) {
    const { useTaskState } = await import('../../composables/use-task-state');
    globalTaskDataManager = useTaskState().taskDataManager;
  }
  return globalTaskDataManager;
}

export class KeyboardManager {
  private stateManager: ApplicationStateManager;
  private taskDataManager: TaskDataManager;

  private commandModeHandler: CommandModeHandler;
  private titleEditModeHandler: TitleEditModeHandler;
  private contentNavigationModeHandler: ContentNavigationModeHandler;
  private contentEditModeHandler: ContentEditModeHandler;
  private lastLineModeHandler: LastLineModeHandler;
  private helpModeHandler: HelpModeHandler;

  constructor() {
    this.taskDataManager = new TaskDataManager();
    this.stateManager = this.taskDataManager;

    this.commandModeHandler = new CommandModeHandler();
    this.titleEditModeHandler = new TitleEditModeHandler();
    this.contentNavigationModeHandler = new ContentNavigationModeHandler();
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
      logger.error('KeyboardManager', 'Failed to initialize TaskDataManager', { error });
    }
  }

  /** 注入滚动回调，建立 domain → UI 的桥梁 */
  setScrollCallback(cb: () => void): void {
    this.commandModeHandler.setScrollCallback(cb);
  }

  handleKeyEvent(event: KeyboardEvent): void {
    const currentState = this.stateManager.getState();
    const activeElement = document.activeElement;
    const isInInputField =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement;

    if (currentState.isHelpVisible) {
      this.helpModeHandler.handleKey(event, this.taskDataManager);
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
        this.commandModeHandler.handleKey(event, key, this.taskDataManager, isInInputField);
        break;
      case EditorMode.TITLE_EDIT:
        this.titleEditModeHandler.handleKey(event, key, this.taskDataManager, isInInputField);
        break;
      case EditorMode.CONTENT_NAVIGATION:
        this.contentNavigationModeHandler.handleKey(event, key, this.taskDataManager, isInInputField);
        break;
      case EditorMode.CONTENT_EDIT:
        this.contentEditModeHandler.handleKey(event, key, this.taskDataManager, isInInputField);
        break;
      case EditorMode.LAST_LINE:
        this.lastLineModeHandler.handleKey(event, key, this.taskDataManager, isInInputField);
        break;
      case EditorMode.TASK_CONFIG:
        break;
      default:
        logger.warn('KeyboardManager', `Unknown editor mode: ${editorMode}`);
    }
  }

  dispose(): void {
    this.commandModeHandler.dispose();
    this.titleEditModeHandler.dispose();
    this.contentNavigationModeHandler.dispose();
    this.contentEditModeHandler.dispose();
    this.lastLineModeHandler.dispose();
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
  const km = getKeyboardManager();

  try {
    document.addEventListener('keydown', (event) => {
      km.handleKeyEvent(event);
    });
  } catch (error) {
    logger.error('KeyboardManager', 'Failed to bind document keydown listener', { error });
  }

  logger.info('KeyboardManager', 'Initialized');
}
