/**
 * 键盘管理器
 * 根据编辑器模式将按键分发给对应的处理器
 */

import { logger } from '../../utils/logger';
import { EditorMode } from '../editor';
import { Store } from '../state/store';
import { store } from '../state/store';
import {
  CommandModeHandler,
  TitleEditModeHandler,
  ContentNavigationModeHandler,
  ContentEditModeHandler,
  LastLineModeHandler,
  HelpModeHandler,
} from './index';
import { ConfigKeyHandler, isConfigEditState } from './config-key-handler';


export class KeyboardManager {
  private store: Store;

  private commandModeHandler: CommandModeHandler;
  private titleEditModeHandler: TitleEditModeHandler;
  private contentNavigationModeHandler: ContentNavigationModeHandler;
  private contentEditModeHandler: ContentEditModeHandler;
  private lastLineModeHandler: LastLineModeHandler;
  private helpModeHandler: HelpModeHandler;
  private configKeyHandler: ConfigKeyHandler;

  constructor() {
    this.store = store;

    this.commandModeHandler = new CommandModeHandler();
    this.titleEditModeHandler = new TitleEditModeHandler();
    this.contentNavigationModeHandler = new ContentNavigationModeHandler();
    this.contentEditModeHandler = new ContentEditModeHandler();
    this.lastLineModeHandler = new LastLineModeHandler();
    this.helpModeHandler = new HelpModeHandler();
    this.configKeyHandler = new ConfigKeyHandler();
  }

  /** 注入滚动回调（mode: nearest/center/top/bottom），建立 domain → UI 的桥梁 */
  setScrollCallback(cb: (mode?: string) => void): void {
    this.commandModeHandler.setScrollCallback(cb);
  }

  /** 注入翻页回调（Ctrl-D/U/F/B），建立 domain → UI 的桥梁 */
  setPageScrollCallback(cb: (dir: number, factor: number) => void): void {
    this.commandModeHandler.setPageScrollCallback(cb);
  }

  handleKeyEvent(event: KeyboardEvent): void {
    const currentState = this.store.getState();
    const activeElement = document.activeElement;
    const isInInputField =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement;

    if (currentState.isHelpVisible) {
      this.helpModeHandler.handleKey(event, this.store);
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

    // 配置展开时：select 态由 ConfigKeyHandler 独占；edit 态由配置输入框独占（其 keydown 已 .stop 拦截），命令层均不介入
    if (editorMode === EditorMode.COMMAND) {
      const tasks = (currentState as any).tasks;
      const configured = tasks?.find((t: any) => t.configState);
      if (configured) {
        if (isConfigEditState(configured.configState)) return;
        if (this.configKeyHandler.handleKey(event, key, this.store)) {
          return;
        }
      }
    }

    switch (editorMode) {
      case EditorMode.COMMAND:
        this.commandModeHandler.handleKey(event, key, this.store, isInInputField);
        break;
      case EditorMode.TITLE_EDIT:
        this.titleEditModeHandler.handleKey(event, key, this.store, isInInputField);
        break;
      case EditorMode.CONTENT_NAVIGATION:
        this.contentNavigationModeHandler.handleKey(event, key, this.store, isInInputField);
        break;
      case EditorMode.CONTENT_EDIT:
        this.contentEditModeHandler.handleKey(event, key, this.store, isInInputField);
        break;
      case EditorMode.LAST_LINE:
        this.lastLineModeHandler.handleKey(event, key, this.store, isInInputField);
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
