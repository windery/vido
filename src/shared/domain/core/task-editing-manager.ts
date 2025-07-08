/**
 * 任务编辑状态管理器
 * 负责任务编辑状态的转换和管理
 */

import { Task, TaskState } from '../task';
import { EditorMode } from '../editor';
import { logger } from '../../../renderer/utils/logger';

export interface TaskEditingState {
  tasks: Task[];
  editorMode: EditorMode;
  taskState: TaskState;
}

export class TaskEditingManager {
  constructor(
    private getState: () => TaskEditingState,
    private updateState: (
      updates: Partial<TaskEditingState>,
      trigger?: string
    ) => void
  ) {}

  /**
   * 开始内容导航模式
   */
  startContentNavigation(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask) return;

    const newTasks = state.tasks.map((task) => {
      if (task.id === selectedTask.id) {
        return {
          ...task,
          status: TaskState.CONTENT_NAVIGATION,
          selected: true,
          cursorLine: task.cursorLine || 0,
          cursorColumn: task.cursorColumn || 0,
          content: task.content || '',
        };
      } else {
        return {
          ...task,
          status: TaskState.VIEWING,
          selected: false,
        };
      }
    });

    this.updateState(
      {
        tasks: newTasks,
        taskState: TaskState.CONTENT_NAVIGATION,
      },
      'start-content-navigation'
    );

    logger.info(
      'TaskEditingManager',
      `Started content navigation for task ${selectedTask.id}`
    );
  }

  /**
   * 开始在光标位置编辑
   */
  startEditingAtCursor(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask || selectedTask.status !== TaskState.CONTENT_NAVIGATION)
      return;

    const newTasks = state.tasks.map((task) =>
      task.id === selectedTask.id
        ? { ...task, status: TaskState.CONTENT_EDITING }
        : task
    );

    this.updateState(
      {
        tasks: newTasks,
        taskState: TaskState.CONTENT_EDITING,
      },
      'start-editing-at-cursor'
    );

    logger.info(
      'TaskEditingManager',
      `Started editing at cursor for task ${selectedTask.id}`
    );
  }

  /**
   * 停止编辑
   */
  stopEditing(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask) return;

    // 如果从内容编辑模式退出，先保存当前光标位置
    if (selectedTask.status === TaskState.CONTENT_EDITING) {
      // 触发光标位置保存事件，让UI层保存当前光标位置
      const event = new CustomEvent('save-cursor-position', {
        detail: { taskId: selectedTask.id },
      });
      document.dispatchEvent(event);
    }

    const newTasks = state.tasks.map((task) => {
      if (task.id === selectedTask.id) {
        if (task.status === TaskState.TITLE_EDITING && task.isNewlyCreated) {
          // 新创建的任务从标题编辑自动进入内容编辑
          return {
            ...task,
            isNewlyCreated: false,
            status: TaskState.CONTENT_EDITING,
          };
        } else if (task.status === TaskState.CONTENT_EDITING) {
          // 从内容编辑退出时进入内容导航模式
          return { ...task, status: TaskState.CONTENT_NAVIGATION };
        } else {
          return { ...task, status: TaskState.VIEWING };
        }
      }
      return task;
    });

    this.updateState({ tasks: newTasks }, 'stop-editing');
    logger.info('TaskEditingManager', 'Stopped editing');
  }

  /**
   * 退出内容导航模式
   */
  exitContentNavigation(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask) return;

    const newTasks = state.tasks.map((task) =>
      task.id === selectedTask.id
        ? { ...task, status: TaskState.VIEWING }
        : task
    );

    this.updateState({ tasks: newTasks }, 'exit-content-navigation');
    logger.info(
      'TaskEditingManager',
      `Exited content navigation for task ${selectedTask.id}`
    );
  }

  /**
   * 开始标题编辑
   */
  startTitleEditing(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask) return;

    // 更新tasks数组并发送通知，让UI层能够响应状态变化
    const newTasks = state.tasks.map((task) => ({
      ...task,
      status:
        task.id === selectedTask.id
          ? TaskState.TITLE_EDITING
          : TaskState.VIEWING,
    }));

    // 使用updateState来发送通知，确保UI层的watch能够响应
    this.updateState({ tasks: newTasks }, 'start-title-editing');

    logger.info(
      'TaskEditingManager',
      `Started title editing for task ${selectedTask.id}`
    );
  }

  /**
   * 根据编辑器模式更新选中任务的状态
   */
  updateSelectedTaskStatus(editorMode: EditorMode, trigger: string): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask) return;

    let newTaskStatus: TaskState;

    switch (editorMode) {
      case EditorMode.COMMAND:
        newTaskStatus = TaskState.SELECTED;
        break;
      case EditorMode.TITLE_EDIT:
        newTaskStatus = TaskState.TITLE_EDITING;
        break;
      case EditorMode.CONTENT_NAVIGATION:
        newTaskStatus = TaskState.CONTENT_NAVIGATION;
        break;
      case EditorMode.CONTENT_EDIT:
        newTaskStatus = TaskState.CONTENT_EDITING;
        break;
      case EditorMode.LAST_LINE:
        newTaskStatus = TaskState.SELECTED;
        break;
      default:
        return; // 不更新状态
    }

    // 只有当状态真正改变时才更新
    if (selectedTask.status !== newTaskStatus) {
      const newTasks = state.tasks.map((task) =>
        task.id === selectedTask.id ? { ...task, status: newTaskStatus } : task
      );

      this.updateState({ tasks: newTasks }, `update-task-status-${trigger}`);

      logger.info(
        'TaskEditingManager',
        `Updated task ${selectedTask.id} status: ${selectedTask.status} -> ${newTaskStatus} (trigger: ${trigger})`
      );
    }
  }
}
