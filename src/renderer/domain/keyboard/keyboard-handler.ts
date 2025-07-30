import { EditorMode } from '../editor';
import { TaskState } from '../task';

// 键盘操作的结果类型
export interface KeyboardActionResult {
  preventDefault?: boolean;
  handled: boolean;
  newEditorMode?: EditorMode;
  newTaskState?: TaskState;
  action?: KeyboardAction;
  error?: string;
}

// 键盘操作类型
export enum KeyboardAction {
  NAVIGATE_UP = 'navigate_up',
  NAVIGATE_DOWN = 'navigate_down',
  ENTER_CONTENT_NAV = 'enter_content_nav',
  ENTER_EDIT = 'enter_edit',
  EXIT_TO_COMMAND = 'exit_to_command',
  EXIT_TO_CONTENT_NAV = 'exit_to_content_nav',
  TOGGLE_COMPLETION = 'toggle_completion',
  DELETE_TASK = 'delete_task',
  COPY_TASK = 'copy_task',
  PASTE_TASK = 'paste_task',
  CREATE_TASK_BELOW = 'create_task_below',
  CREATE_TASK_ABOVE = 'create_task_above',
  GO_TO_FIRST = 'go_to_first',
  GO_TO_LAST = 'go_to_last',
  START_SEARCH = 'start_search',
  START_COMMAND = 'start_command',
  SHOW_HELP = 'show_help',
  ENTER_TITLE_EDIT = 'enter_title_edit',
  MOVE_CURSOR_LEFT = 'move_cursor_left',
  MOVE_CURSOR_RIGHT = 'move_cursor_right',
  MOVE_CURSOR_UP = 'move_cursor_up',
  MOVE_CURSOR_DOWN = 'move_cursor_down',
  MOVE_TO_LINE_START = 'move_to_line_start',
  MOVE_TO_LINE_END = 'move_to_line_end',
  MOVE_TO_FIRST_LINE = 'move_to_first_line',
  MOVE_TO_LAST_LINE = 'move_to_last_line',
  EXECUTE_COMMAND = 'execute_command',
  HIDE_LAST_LINE = 'hide_last_line',
  BLUR_INPUT_ONLY = 'blur_input_only',
  CLEAR_KEY_SEQUENCE = 'clear_key_sequence',
}

// 键盘上下文
export interface KeyboardContext {
  editorMode: EditorMode;
  taskState: TaskState;
  isInInputField: boolean;
  targetTagName: string;
  keySequence: string;
}

// 纯业务逻辑的键盘处理器
export class KeyboardHandler {
  private keySequence: string = '';

  // 处理键盘输入，返回应该执行的操作
  handleKeyPress(key: string, context: KeyboardContext): KeyboardActionResult {
    // 在LAST_LINE模式下，只有在输入框外才让KeyboardHandler处理
    if (context.editorMode === EditorMode.LAST_LINE && context.isInInputField) {
      return { handled: false };
    }

    // 如果在输入框中，优先处理输入框相关的键盘事件
    if (context.isInInputField) {
      return this.handleInputFieldKey(key, context);
    }

    // 根据编辑器模式处理键盘输入
    switch (context.editorMode) {
      case EditorMode.COMMAND:
        return this.handleCommandModeKey(key, context);
      case EditorMode.CONTENT_NAVIGATION:
        return this.handleContentNavigationKey(key, context);
      case EditorMode.TITLE_EDIT:
        return this.handleTitleEditModeKey(key, context);
      case EditorMode.CONTENT_EDIT:
        return this.handleContentEditModeKey(key, context);
      case EditorMode.LAST_LINE:
        return this.handleLastLineModeKey(key, context);
      default:
        return { handled: false };
    }
  }

  private handleInputFieldKey(
    key: string,
    context: KeyboardContext
  ): KeyboardActionResult {
    // 忽略修饰键
    const modifierKeys = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'];
    if (modifierKeys.includes(key)) {
      return {
        handled: false, // 让输入框正常处理修饰键
      };
    }

    // 在TITLE_EDIT模式下，处理特殊键
    if (context.editorMode === EditorMode.TITLE_EDIT) {
      if (key === 'Escape') {
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.EXIT_TO_COMMAND,
        };
      }
      if (key === 'Enter') {
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.EXIT_TO_COMMAND,
        };
      }
      // 其他键让输入框正常处理
      return { handled: false };
    }

    // 如果在输入框中但不是编辑模式，ESC应该只是失去焦点，不进行状态转换
    if (context.editorMode === EditorMode.COMMAND && key === 'Escape') {
      return {
        handled: true,
        preventDefault: true,
        action: KeyboardAction.BLUR_INPUT_ONLY, // 只失去焦点，不进行状态转换
      };
    }

    // 在CONTENT_EDIT模式下，允许正常的输入行为（除了Escape键）
    if (context.editorMode === EditorMode.CONTENT_EDIT) {
      if (key === 'Escape') {
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.EXIT_TO_CONTENT_NAV,
        };
      }
      // 其他键让输入框正常处理
      return { handled: false };
    }

    // 在CONTENT_NAVIGATION模式下，处理导航键和特殊键
    if (context.editorMode === EditorMode.CONTENT_NAVIGATION) {
      // 对于导航键，委托给handleContentNavigationKey处理
      if (
        ['j', 'k', 'h', 'l', '0', '$', 'G', 'g', 'i', 'o', 'Escape'].includes(
          key
        )
      ) {
        return this.handleContentNavigationKey(key, context);
      }
      // 其他键退出到content navigation
      return {
        handled: true,
        preventDefault: true,
        action: KeyboardAction.EXIT_TO_CONTENT_NAV,
      };
    }

    // 在COMMAND模式下，如果在输入框中，让输入框正常处理所有键（除了Escape）
    if (context.editorMode === EditorMode.COMMAND) {
      if (key === 'Escape') {
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.BLUR_INPUT_ONLY, // 只失去焦点，不进行状态转换
        };
      }
      // 其他键让输入框正常处理
      return { handled: false };
    }

    // 其他模式下，只处理Escape键
    if (key !== 'Escape') {
      return { handled: false };
    }

    return {
      handled: true,
      preventDefault: true,
      action: KeyboardAction.EXIT_TO_COMMAND,
    };
  }

  private handleCommandModeKey(
    key: string,
    _context: KeyboardContext
  ): KeyboardActionResult {
    // 忽略修饰键（Shift、Control、Alt、Meta等）
    const modifierKeys = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'];
    if (modifierKeys.includes(key)) {
      return {
        handled: true,
        preventDefault: false, // 不阻止默认行为，让修饰键正常工作
      };
    }

    // 处理多键序列
    this.keySequence += key;

    // 检查多键序列
    if (this.keySequence === 'dd') {
      this.resetKeySequence();
      return {
        handled: true,
        preventDefault: true,
        action: KeyboardAction.DELETE_TASK,
      };
    }

    if (this.keySequence === 'yy') {
      this.resetKeySequence();
      return {
        handled: true,
        preventDefault: true,
        action: KeyboardAction.COPY_TASK,
      };
    }

    if (this.keySequence === 'gg') {
      this.resetKeySequence();
      return {
        handled: true,
        preventDefault: true,
        action: KeyboardAction.GO_TO_FIRST,
      };
    }

    // 单键操作
    switch (key) {
      case 'k':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.NAVIGATE_UP,
        };
      case 'j':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.NAVIGATE_DOWN,
        };
      case 'i':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.ENTER_CONTENT_NAV,
        };
      case '/':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.START_SEARCH,
        };
      case ':':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.START_COMMAND,
        };
      case '?':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.SHOW_HELP,
        };
      case 'Enter':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.ENTER_TITLE_EDIT,
        };
      case ' ':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.TOGGLE_COMPLETION,
        };
      case 'p':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.PASTE_TASK,
        };
      case 'o':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.CREATE_TASK_BELOW,
        };
      case 'O':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.CREATE_TASK_ABOVE,
        };
      case 'G':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.GO_TO_LAST,
        };
      case 'Escape':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.CLEAR_KEY_SEQUENCE, // 明确表示这是清除键序列的操作
        };
      default:
        // 对于不识别的键，等待一段时间后重置序列
        setTimeout(() => this.resetKeySequence(), 1000);
        return { handled: false };
    }
  }

  private handleContentNavigationKey(
    key: string,
    _context: KeyboardContext
  ): KeyboardActionResult {
    // 忽略修饰键
    const modifierKeys = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'];
    if (modifierKeys.includes(key)) {
      return {
        handled: true,
        preventDefault: false,
      };
    }

    // 处理多键序列
    this.keySequence += key;

    if (this.keySequence === 'gg') {
      this.resetKeySequence();
      return {
        handled: true,
        preventDefault: true,
        action: KeyboardAction.MOVE_TO_FIRST_LINE,
      };
    }

    switch (key) {
      case 'Escape':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.EXIT_TO_COMMAND,
        };
      case 'i':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.ENTER_EDIT,
        };
      case 'j':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.MOVE_CURSOR_DOWN,
        };
      case 'k':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.MOVE_CURSOR_UP,
        };
      case 'h':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.MOVE_CURSOR_LEFT,
        };
      case 'l':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.MOVE_CURSOR_RIGHT,
        };
      case 'G':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.MOVE_TO_LAST_LINE,
        };
      case '$':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.MOVE_TO_LINE_END,
        };
      case '0':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.MOVE_TO_LINE_START,
        };
      case 'o':
        this.resetKeySequence();
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.ENTER_EDIT,
        };
      default:
        setTimeout(() => this.resetKeySequence(), 1000);
        return { handled: false };
    }
  }

  private handleTitleEditModeKey(
    key: string,
    _context: KeyboardContext
  ): KeyboardActionResult {
    if (key === 'Escape') {
      return {
        handled: true,
        preventDefault: true,
        action: KeyboardAction.EXIT_TO_COMMAND,
      };
    }
    if (key === 'Enter') {
      return {
        handled: true,
        preventDefault: true,
        action: KeyboardAction.EXIT_TO_COMMAND,
      };
    }
    // 其他键都让输入框正常处理
    return { handled: false };
  }

  private handleContentEditModeKey(
    key: string,
    _context: KeyboardContext
  ): KeyboardActionResult {
    if (key === 'Escape') {
      return {
        handled: true,
        preventDefault: true,
        action: KeyboardAction.EXIT_TO_CONTENT_NAV,
      };
    }
    // 其他键都让输入框正常处理
    return { handled: false };
  }

  private handleLastLineModeKey(
    key: string,
    _context: KeyboardContext
  ): KeyboardActionResult {
    switch (key) {
      case 'Escape':
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.EXIT_TO_COMMAND,
        };
      case 'Enter':
        return {
          handled: true,
          preventDefault: true,
          action: KeyboardAction.EXECUTE_COMMAND,
        };
      default:
        return { handled: false };
    }
  }

  private resetKeySequence(): void {
    this.keySequence = '';
  }

  // 获取当前键序列（用于调试）
  getCurrentKeySequence(): string {
    return this.keySequence;
  }
}
