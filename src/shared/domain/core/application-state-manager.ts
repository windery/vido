/**
 * 应用状态管理器
 * 整合编辑器状态机和任务状态，提供统一的状态管理
 */

import { StateManager } from './state-manager';
import { ApplicationState } from '../interfaces/observer';
import { EditorMode } from '../editor';
import { TaskState } from '../task';
import { StateMachine, deriveTaskState } from '../state-machine';
import { logger } from '../../../renderer/utils/logger';

export class ApplicationStateManager extends StateManager {
  private stateMachine: StateMachine;

  constructor(initialState?: Partial<ApplicationState>) {
    const defaultState: ApplicationState = {
      editorMode: EditorMode.COMMAND,
      taskState: TaskState.VIEWING,
      selectedTaskId: undefined,
      cursorPosition: undefined,
      isHelpVisible: false,
      lastlineContent: '',
      lastlineVisible: false,
      ...initialState,
    };

    super(defaultState);
    this.stateMachine = new StateMachine();
    this.stateMachine.setCurrentState(defaultState.editorMode);
  }

  /**
   * 执行状态转换
   */
  transition(
    trigger: string,
    context?: any
  ): {
    success: boolean;
    newState?: ApplicationState;
    error?: string;
  } {
    try {
      // 使用状态机验证转换
      logger.info(
        'ApplicationStateManager',
        `Calling stateMachine.transition with trigger: ${trigger}, current state: ${this.currentState.editorMode}`
      );
      const result = this.stateMachine.transition(trigger);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      const newEditorMode = result.transition!.to;
      const hasSelectedTask = this.currentState.selectedTaskId !== undefined;
      const newTaskState = deriveTaskState(newEditorMode, hasSelectedTask);

      logger.info(
        'ApplicationStateManager',
        `State transition: ${this.currentState.editorMode} -> ${newEditorMode} (trigger: ${trigger})`
      );
      logger.info(
        'ApplicationStateManager',
        `deriveTaskState: editorMode=${newEditorMode}, hasSelectedTask=${hasSelectedTask}, taskState=${newTaskState}`
      );

      const newStateUpdates: Partial<ApplicationState> = {
        editorMode: newEditorMode,
        taskState: newTaskState,
      };

      // 根据转换类型添加额外的状态更新
      this.applyContextualUpdates(newStateUpdates, trigger, context);

      // 验证转换
      if (
        !this.validateTransition(this.currentState, newStateUpdates, trigger)
      ) {
        return {
          success: false,
          error: 'Invalid state transition',
        };
      }

      // 更新状态
      this.updateState(newStateUpdates, trigger);

      return {
        success: true,
        newState: this.getState(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 应用上下文相关的状态更新
   */
  private applyContextualUpdates(
    stateUpdates: Partial<ApplicationState>,
    trigger: string,
    context?: any
  ): void {
    switch (trigger) {
      case 'i':
        if (stateUpdates.editorMode === EditorMode.CONTENT_NAVIGATION) {
          stateUpdates.cursorPosition = { line: 0, column: 0 };
        }
        break;

      case '/':
        stateUpdates.lastlineContent = '/';
        stateUpdates.lastlineVisible = true;
        break;

      case ':':
        stateUpdates.lastlineContent = ':';
        stateUpdates.lastlineVisible = true;
        logger.info(
          'ApplicationStateManager',
          `Setting lastlineVisible=true for trigger ':'`
        );
        break;

      case 'Escape':
        if (this.currentState.editorMode === EditorMode.LAST_LINE) {
          stateUpdates.lastlineVisible = false;
          stateUpdates.lastlineContent = '';
        } else if (this.currentState.editorMode === EditorMode.COMMAND) {
          // 在COMMAND模式下按Escape，如果有活跃的搜索，清除它
          const currentContent = this.currentState.lastlineContent;
          if (currentContent && currentContent.startsWith('/')) {
            stateUpdates.lastlineContent = '';
            stateUpdates.lastlineVisible = false;
            logger.info(
              'ApplicationStateManager',
              `Clearing search filter on Escape in COMMAND mode: "${currentContent}"`
            );
          }
        } else if (this.currentState.editorMode === EditorMode.CONTENT_EDIT) {
          // 从内容编辑模式退出时，保持光标位置
          // 光标位置会在UI层通过事件保存
        }
        break;

      case 'Enter':
        if (this.currentState.editorMode === EditorMode.LAST_LINE) {
          const currentContent = this.currentState.lastlineContent;
          // 如果是搜索命令（以/开头），保持搜索状态
          if (currentContent && currentContent.startsWith('/')) {
            stateUpdates.lastlineVisible = false; // 隐藏输入框
            // 保持lastlineContent，这样过滤条件继续生效
            logger.info(
              'ApplicationStateManager',
              `Keeping search active for Enter trigger: ${currentContent}`
            );
          } else {
            // 非搜索命令，清除内容
            stateUpdates.lastlineVisible = false;
            stateUpdates.lastlineContent = '';
            logger.info(
              'ApplicationStateManager',
              `Setting lastlineVisible=false for Enter trigger in LAST_LINE mode`
            );
          }
        }
        break;

      case '?':
        stateUpdates.isHelpVisible = !this.currentState.isHelpVisible;
        break;
    }

    // 如果有上下文信息，应用它们
    if (context) {
      if (context.selectedTaskId !== undefined) {
        stateUpdates.selectedTaskId = context.selectedTaskId;
      }
      if (context.cursorPosition) {
        stateUpdates.cursorPosition = context.cursorPosition;
      }
    }
  }

  /**
   * 验证状态转换的有效性
   */
  protected validateTransition(
    from: ApplicationState,
    to: Partial<ApplicationState>,
    trigger: string
  ): boolean {
    // 基本验证规则
    if (to.editorMode === undefined && to.taskState === undefined) {
      return false;
    }

    // 特定转换验证
    switch (trigger) {
      case 'i':
        // 只有在特定状态下才能进入内容编辑
        if (to.editorMode === EditorMode.CONTENT_NAVIGATION) {
          return from.editorMode === EditorMode.COMMAND;
        }
        if (to.editorMode === EditorMode.CONTENT_EDIT) {
          return from.editorMode === EditorMode.CONTENT_NAVIGATION;
        }
        return true;

      case 'Escape':
        // Escape可以从任何模式使用
        // 在COMMAND模式下，主要用于清除搜索过滤等状态
        return true;

      default:
        return true;
    }
  }

  /**
   * 更新选中的任务
   */
  selectTask(taskId: number): void {
    this.updateState({ selectedTaskId: taskId }, 'task-selection');
  }

  /**
   * 更新光标位置
   */
  updateCursorPosition(line: number, column: number): void {
    this.updateState({ cursorPosition: { line, column } }, 'cursor-update');
  }

  /**
   * 更新lastline内容
   */
  updateLastlineContent(content: string): void {
    this.updateState({ lastlineContent: content }, 'lastline-update');
  }

  /**
   * 切换帮助页面显示
   */
  toggleHelp(): void {
    this.updateState(
      { isHelpVisible: !this.currentState.isHelpVisible },
      'toggle-help'
    );
  }

  /**
   * 重置状态到初始状态
   */
  reset(): void {
    const initialState: ApplicationState = {
      editorMode: EditorMode.COMMAND,
      taskState: TaskState.VIEWING,
      selectedTaskId: undefined,
      cursorPosition: undefined,
      isHelpVisible: false,
      lastlineContent: '',
      lastlineVisible: false,
    };

    this.currentState = initialState;
    this.stateMachine.setCurrentState(initialState.editorMode);

    this.notify({
      type: 'state-transition',
      from: { editorMode: -1 },
      to: {
        editorMode: initialState.editorMode,
      },
      trigger: 'reset',
      timestamp: Date.now(),
    });
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): {
    currentState: ApplicationState;
    stateMachineState: any;
    observerCount: number;
  } {
    return {
      currentState: this.getState(),
      stateMachineState: this.stateMachine.getCurrentState(),
      observerCount: (this as any).observers?.length || 0,
    };
  }
}
