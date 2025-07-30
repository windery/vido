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
import { TaskConfigModeHandler } from './task-config-mode-handler';

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
  private taskConfigModeHandler: TaskConfigModeHandler;

  constructor() {
    this.keyboardHandler = new KeyboardHandler();
    // 初始化时先创建临时实例，稍后会被替换
    this.taskDataManager = new TaskDataManager();
    this.stateManager = this.taskDataManager; // TaskDataManager extends ApplicationStateManager

    // 初始化模式处理器
    this.commandModeHandler = new CommandModeHandler();
    this.titleEditModeHandler = new TitleEditModeHandler(this.keyboardHandler);
    this.contentNavigationModeHandler = new ContentNavigationModeHandler(
      this.keyboardHandler
    );
    this.contentEditModeHandler = new ContentEditModeHandler();
    this.lastLineModeHandler = new LastLineModeHandler();
    this.helpModeHandler = new HelpModeHandler();
    this.taskConfigModeHandler = new TaskConfigModeHandler();

    // 异步获取全局实例
    this.initializeTaskDataManager();
  }

  private async initializeTaskDataManager(): Promise<void> {
    try {
      this.taskDataManager = await getGlobalTaskDataManager();
      this.stateManager = this.taskDataManager;
      logger.info(
        'KeyboardManager',
        'TaskDataManager initialized with global instance'
      );
    } catch (error) {
      logger.error('KeyboardManager', 'Failed to initialize TaskDataManager', {
        error,
      });
    }
  }

  /**
   * 处理键盘事件 - 统一的全局键盘处理入口
   */
  handleKeyEvent(event: KeyboardEvent): void {
    const currentState = this.stateManager.getState();
    const activeElement = document.activeElement;
    const isInInputField =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement;

    logger.info(
      'KeyboardManager',
      `Global key event: key=${event.key}, mode=${EditorMode[currentState.editorMode]}, selected=${currentState.selectedTaskId ?? 'none'}, inInput=${isInInputField}`
    );

    // 如果帮助页面显示，特殊处理
    if (currentState.isHelpVisible) {
      this.handleHelpModeKey(event);
      return;
    }

    // 基于当前编辑器状态和实体信息统一处理按键
    this.handleKeyBasedOnEditorMode(event, currentState, isInInputField);
  }

  /**
   * 基于编辑器状态统一处理按键
   */
  private handleKeyBasedOnEditorMode(
    event: KeyboardEvent,
    currentState: any,
    isInInputField: boolean
  ): void {
    const key = event.key;
    const { editorMode } = currentState;

    logger.info(
      'KeyboardManager',
      `Processing key '${key}' in mode ${EditorMode[editorMode]}`
    );

    let handled = false;

    // 根据编辑器状态分发处理
    switch (editorMode) {
      case EditorMode.COMMAND:
        handled = this.commandModeHandler.handleKey(
          event,
          key,
          this.taskDataManager,
          isInInputField
        );
        break;

      case EditorMode.TITLE_EDIT:
        handled = this.titleEditModeHandler.handleKey(
          event,
          key,
          this.taskDataManager,
          isInInputField
        );
        break;

      case EditorMode.CONTENT_NAVIGATION:
        handled = this.contentNavigationModeHandler.handleKey(
          event,
          key,
          this.taskDataManager,
          isInInputField
        );
        break;

      case EditorMode.CONTENT_EDIT:
        handled = this.contentEditModeHandler.handleKey(
          event,
          key,
          this.taskDataManager,
          isInInputField
        );
        break;

      case EditorMode.LAST_LINE:
        handled = this.lastLineModeHandler.handleKey(
          event,
          key,
          this.taskDataManager,
          isInInputField
        );
        break;

      case EditorMode.TASK_CONFIG:
        // 对于TASK_CONFIG模式，所有键都让组件处理
        // 键盘管理器不拦截任何键
        handled = false;
        break;

      default:
        logger.warn('KeyboardManager', `Unknown editor mode: ${editorMode}`);
    }

    if (!handled) {
      logger.info(
        'KeyboardManager',
        `Key '${key}' not handled by mode handler`
      );
    }
  }

  /**
   * 帮助模式下的键盘处理
   */
  private handleHelpModeKey(event: KeyboardEvent): void {
    this.helpModeHandler.handleKey(event, this.taskDataManager);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    logger.info('KeyboardManager', 'Resources cleaned up');
  }
}

// 创建全局键盘管理器实例
let keyboardManagerInstance: KeyboardManager | null = null;

/**
 * 获取键盘管理器实例
 */
export function getKeyboardManager(): KeyboardManager {
  if (!keyboardManagerInstance) {
    keyboardManagerInstance = new KeyboardManager();
  }
  return keyboardManagerInstance;
}

/**
 * 初始化键盘管理器
 */
export function initializeKeyboardManager(): void {
  const keyboardManager = getKeyboardManager();

  logger.info('KeyboardManager', 'Starting keyboard manager initialization...');

  // 检查document是否准备好
  logger.info(
    'KeyboardManager',
    `Document ready state: ${document.readyState}`
  );
  logger.info('KeyboardManager', `Document exists: ${!!document}`);
  logger.info('KeyboardManager', `Window exists: ${!!window}`);

  // 绑定全局键盘事件
  try {
    document.addEventListener('keydown', (event) => {
      logger.info(
        'KeyboardManager',
        `Global keydown event captured: ${event.key}`
      );
      keyboardManager.handleKeyEvent(event);
    });
    logger.info(
      'KeyboardManager',
      'Document keydown listener bound successfully'
    );
  } catch (error) {
    logger.error(
      'KeyboardManager',
      'Failed to bind document keydown listener',
      { error }
    );
  }

  // 添加另一个事件监听器作为备份
  try {
    window.addEventListener(
      'keydown',
      (event) => {
        logger.info(
          'KeyboardManager',
          `Window keydown event captured: ${event.key}`
        );
      },
      true
    );
    logger.info(
      'KeyboardManager',
      'Window keydown listener bound successfully'
    );
  } catch (error) {
    logger.error('KeyboardManager', 'Failed to bind window keydown listener', {
      error,
    });
  }

  // 仅在开发环境下测试事件监听器是否工作
  if (process.env.NODE_ENV === 'development') {
    try {
      const testEvent = new KeyboardEvent('keydown', { key: 'test' });
      logger.info('KeyboardManager', 'Dispatching test keyboard event...');
      document.dispatchEvent(testEvent);
    } catch (error) {
      logger.error('KeyboardManager', 'Failed to dispatch test event', {
        error,
      });
    }
  }

  // 在开发环境下启用调试
  if (import.meta.env.DEV) {
    logger.info(
      'KeyboardManager',
      'Keyboard manager initialized in development mode'
    );
  }

  logger.info('KeyboardManager', 'Keyboard manager initialization completed');
}
