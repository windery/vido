import { EditorMode } from './editor';
import { TaskState } from './task';
import { logger } from '../utils/logger';

// 定义状态转换规则 - 只管理EditorMode，TaskState由推导函数计算
export interface StateTransition {
  from: EditorMode;
  to: EditorMode;
  trigger: string;
  description: string;
}

// 状态转换表 - 只管理EditorMode转换
export const STATE_TRANSITIONS: StateTransition[] = [
  // COMMAND模式的转换
  {
    from: EditorMode.COMMAND,
    to: EditorMode.TITLE_EDIT,
    trigger: 'Enter',
    description: 'Start editing task title',
  },
  {
    from: EditorMode.COMMAND,
    to: EditorMode.CONTENT_NAVIGATION,
    trigger: 'i',
    description: 'Enter content navigation mode',
  },
  {
    from: EditorMode.COMMAND,
    to: EditorMode.LAST_LINE,
    trigger: '/',
    description: 'Start search',
  },
  {
    from: EditorMode.COMMAND,
    to: EditorMode.LAST_LINE,
    trigger: ':',
    description: 'Enter command mode',
  },
  {
    from: EditorMode.COMMAND,
    to: EditorMode.COMMAND,
    trigger: 'Escape',
    description: 'Clear search filter or other states',
  },
  // TITLE_EDIT模式的转换
  {
    from: EditorMode.TITLE_EDIT,
    to: EditorMode.COMMAND,
    trigger: 'Enter',
    description: 'Finish editing title and return to command mode',
  },
  {
    from: EditorMode.TITLE_EDIT,
    to: EditorMode.COMMAND,
    trigger: 'Escape',
    description: 'Cancel title editing and return to command mode',
  },

  // CONTENT_NAVIGATION模式的转换
  {
    from: EditorMode.CONTENT_NAVIGATION,
    to: EditorMode.CONTENT_EDIT,
    trigger: 'i',
    description: 'Start editing content at cursor position',
  },
  {
    from: EditorMode.CONTENT_NAVIGATION,
    to: EditorMode.CONTENT_EDIT,
    trigger: 'a',
    description: 'Start editing content after cursor position (append)',
  },
  {
    from: EditorMode.CONTENT_NAVIGATION,
    to: EditorMode.CONTENT_EDIT,
    trigger: 'o',
    description: 'Start editing content and insert new line below',
  },
  {
    from: EditorMode.CONTENT_NAVIGATION,
    to: EditorMode.COMMAND,
    trigger: 'Escape',
    description: 'Exit content navigation and return to command mode',
  },

  // CONTENT_EDIT模式的转换
  {
    from: EditorMode.CONTENT_EDIT,
    to: EditorMode.CONTENT_NAVIGATION,
    trigger: 'Escape',
    description: 'Exit content editing and return to content navigation',
  },

  // LAST_LINE模式的转换
  {
    from: EditorMode.LAST_LINE,
    to: EditorMode.COMMAND,
    trigger: 'Enter',
    description: 'Execute command and return to command mode',
  },
  {
    from: EditorMode.LAST_LINE,
    to: EditorMode.COMMAND,
    trigger: 'Escape',
    description: 'Cancel command and return to command mode',
  },

];

// TaskState推导函数 - 根据EditorMode动态计算TaskState
export function deriveTaskState(
  editorMode: EditorMode,
  hasSelectedTask: boolean = true
): TaskState {
  if (!hasSelectedTask) {
    return TaskState.VIEWING;
  }

  switch (editorMode) {
    case EditorMode.COMMAND:
      return TaskState.SELECTED; // 命令模式下，选中的任务处于SELECTED状态
    case EditorMode.TITLE_EDIT:
      return TaskState.TITLE_EDITING;
    case EditorMode.CONTENT_NAVIGATION:
      return TaskState.CONTENT_NAVIGATION;
    case EditorMode.CONTENT_EDIT:
      return TaskState.CONTENT_EDITING;
    case EditorMode.LAST_LINE:
      return TaskState.SELECTED; // 命令行模式下，任务状态保持SELECTED
    default:
      return TaskState.VIEWING;
  }
}

// 简化的状态机类 - 只管理EditorMode
export class StateMachine {
  private currentEditorMode: EditorMode = EditorMode.COMMAND;

  constructor() {}

  // 获取当前EditorMode
  getCurrentState() {
    return {
      editorMode: this.currentEditorMode,
    };
  }

  // 设置当前EditorMode
  setCurrentState(editorMode: EditorMode) {
    this.currentEditorMode = editorMode;
  }

  // 查找有效的状态转换
  findValidTransition(trigger: string): StateTransition | null {
    const transition = STATE_TRANSITIONS.find(
      (transition) =>
        transition.trigger === trigger &&
        transition.from === this.currentEditorMode
    );

    logger.info(
      'StateMachine',
      `findValidTransition: trigger=${trigger}, currentEditorMode=${this.currentEditorMode}, found=${!!transition}`
    );
    if (transition) {
      logger.info(
        'StateMachine',
        `found transition from ${transition.from} to ${transition.to}`
      );
    }

    return transition || null;
  }

  // 执行状态转换
  transition(trigger: string): {
    success: boolean;
    transition?: StateTransition;
    error?: string;
  } {
    logger.info(
      'StateMachine',
      `transition called with trigger: ${trigger}, currentEditorMode: ${this.currentEditorMode}`
    );

    const validTransition = this.findValidTransition(trigger);

    if (!validTransition) {
      logger.warn(
        'StateMachine',
        `no valid transition found for trigger '${trigger}' from editor mode ${this.currentEditorMode}`
      );
      return {
        success: false,
        error: `No valid transition found for trigger '${trigger}' from editor mode ${EditorMode[this.currentEditorMode]}`,
      };
    }

    logger.info(
      'StateMachine',
      `executing transition from ${validTransition.from} to ${validTransition.to}`
    );

    // 更新EditorMode
    this.currentEditorMode = validTransition.to;

    return {
      success: true,
      transition: validTransition,
    };
  }

  // 获取当前状态下可用的触发器
  getAvailableTriggers(): string[] {
    return STATE_TRANSITIONS.filter(
      (transition) => transition.from === this.currentEditorMode
    ).map((transition) => transition.trigger);
  }
}
