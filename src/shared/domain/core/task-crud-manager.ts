/**
 * 任务CRUD操作管理器
 * 负责任务的创建、删除、复制、粘贴、切换完成状态等操作
 */

import { Task, TaskState, TaskPriority } from '../task';
import { logger } from '../../../renderer/utils/logger';

export interface TaskCrudState {
  tasks: Task[];
  maxId: number;
  clipboard: Task | null;
}

export class TaskCrudManager {
  constructor(
    private getState: () => TaskCrudState,
    private updateState: (
      updates: Partial<TaskCrudState>,
      trigger?: string
    ) => void
  ) {}

  /**
   * 生成新的任务ID
   */
  generateId(): number {
    const state = this.getState();
    const newId = state.maxId + 1;
    this.updateState({ maxId: newId }, 'generate-id');
    return newId;
  }

  /**
   * 添加任务
   */
  addTask(task: Task): void {
    const state = this.getState();
    const newTasks = [...state.tasks, task];
    this.updateState({ tasks: newTasks }, 'add-task');
    logger.info('TaskCrudManager', `Added task ${task.id}: ${task.title}`);
  }

  /**
   * 删除任务
   */
  removeTask(taskId: number): void {
    const state = this.getState();
    const newTasks = state.tasks.filter((task) => task.id !== taskId);
    this.updateState({ tasks: newTasks }, 'remove-task');
    logger.info('TaskCrudManager', `Removed task ${taskId}`);
  }

  /**
   * 更新任务属性
   */
  updateTaskProperty(taskId: number, property: string, value: any): void {
    const state = this.getState();
    const taskExists = state.tasks.find((task) => task.id === taskId);

    if (!taskExists) {
      logger.warn('TaskCrudManager', `Task ${taskId} not found`);
      return;
    }

    const newTasks = state.tasks.map((task) =>
      task.id === taskId ? { ...task, [property]: value } : task
    );

    this.updateState({ tasks: newTasks }, `update-task-${property}`);
    logger.info(
      'TaskCrudManager',
      `Updated task ${taskId} ${property}: ${value}`
    );
  }

  /**
   * 创建新任务
   */
  createNewTask(title: string = '', insertAfter: boolean = true): Task {
    const state = this.getState();
    const newId = this.generateId();

    const newTask: Task = {
      id: newId,
      title,
      content: '',
      completed: false,
      selected: true,
      status: TaskState.SELECTED,
      tags: [],
      priority: TaskPriority.MEDIUM,
      isNewlyCreated: true,
      cursorLine: 0,
      cursorColumn: 0,
    };

    const selectedIndex = state.tasks.findIndex((task) => task.selected);

    // 取消所有任务的选中状态
    const clearedTasks = state.tasks.map((task) => ({
      ...task,
      selected: false,
      status: TaskState.VIEWING,
    }));

    let newTasks: Task[];
    if (selectedIndex > -1) {
      const insertIndex = insertAfter ? selectedIndex + 1 : selectedIndex;
      newTasks = [...clearedTasks];
      newTasks.splice(insertIndex, 0, newTask);
    } else {
      newTasks = [...clearedTasks, newTask];
    }

    this.updateState({ tasks: newTasks }, 'create-new-task');
    logger.info('TaskCrudManager', `Created new task ${newId}: ${title}`);
    return newTask;
  }

  /**
   * 删除选中的任务
   */
  deleteSelectedTask(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask) {
      logger.warn('TaskCrudManager', 'No task selected for deletion');
      return;
    }

    const selectedIndex = state.tasks.findIndex(
      (task) => task.id === selectedTask.id
    );
    const newTasks = state.tasks.filter((task) => task.id !== selectedTask.id);

    // 选择新的任务
    if (newTasks.length > 0) {
      const newSelectedIndex = Math.min(selectedIndex, newTasks.length - 1);
      newTasks[newSelectedIndex] = {
        ...newTasks[newSelectedIndex],
        selected: true,
        status: TaskState.SELECTED,
      };
    }

    this.updateState({ tasks: newTasks }, 'delete-selected-task');
    logger.info('TaskCrudManager', `Deleted task ${selectedTask.id}`);
  }

  /**
   * 复制选中的任务
   */
  copySelectedTask(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask) {
      logger.warn('TaskCrudManager', 'No task selected for copying');
      return;
    }

    // 创建任务副本（不包含ID和状态信息）
    const taskCopy = {
      ...selectedTask,
      id: 0, // 临时ID，粘贴时会重新生成
      selected: false,
      status: TaskState.VIEWING,
      isNewlyCreated: false,
    };

    this.updateState({ clipboard: taskCopy }, 'copy-selected-task');
    logger.info('TaskCrudManager', `Copied task: ${selectedTask.id}`);
  }

  /**
   * 粘贴任务
   */
  pasteTask(): void {
    const state = this.getState();
    if (!state.clipboard) {
      logger.warn('TaskCrudManager', 'No task in clipboard');
      return;
    }

    const newId = this.generateId();
    const newTask = {
      ...state.clipboard,
      id: newId,
      selected: true,
      status: TaskState.SELECTED,
    };

    const selectedIndex = state.tasks.findIndex((task) => task.selected);

    // 取消其他任务的选中状态
    const clearedTasks = state.tasks.map((task) => ({
      ...task,
      selected: false,
      status: TaskState.VIEWING,
    }));

    // 在选中任务后插入
    if (selectedIndex >= 0) {
      clearedTasks.splice(selectedIndex + 1, 0, newTask);
    } else {
      clearedTasks.push(newTask);
    }

    this.updateState({ tasks: clearedTasks }, 'paste-task');
    logger.info('TaskCrudManager', `Pasted task as new task ${newId}`);
  }

  /**
   * 切换任务完成状态
   */
  toggleTaskCompletion(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask) {
      logger.warn(
        'TaskCrudManager',
        'No task selected for toggling completion'
      );
      return;
    }

    const newTasks = state.tasks.map((task) =>
      task.id === selectedTask.id
        ? { ...task, completed: !task.completed }
        : task
    );

    this.updateState({ tasks: newTasks }, 'toggle-task-completion');
    logger.info(
      'TaskCrudManager',
      `Toggled completion for task ${selectedTask.id}`
    );
  }

  /**
   * 排序任务
   */
  sortTasks(sortType: string): void {
    const state = this.getState();
    let sortedTasks: Task[];

    switch (sortType) {
      case 'priority': {
        const priorityOrder = {
          [TaskPriority.HIGH]: 3,
          [TaskPriority.MEDIUM]: 2,
          [TaskPriority.LOW]: 1,
        };
        sortedTasks = [...state.tasks].sort((a, b) => {
          const aPrio = priorityOrder[a.priority || TaskPriority.MEDIUM] || 2;
          const bPrio = priorityOrder[b.priority || TaskPriority.MEDIUM] || 2;
          return bPrio - aPrio;
        });
        break;
      }
      case 'created':
        sortedTasks = [...state.tasks].sort((a, b) => a.id - b.id);
        break;
      case 'updated':
        sortedTasks = [...state.tasks].sort((a, b) => b.id - a.id);
        break;
      case 'title':
        sortedTasks = [...state.tasks].sort((a, b) =>
          a.title.localeCompare(b.title)
        );
        break;
      case 'completed':
        sortedTasks = [...state.tasks].sort((a, b) => {
          if (a.completed === b.completed) return 0;
          return a.completed ? 1 : -1;
        });
        break;
      default:
        logger.warn('TaskCrudManager', `Unknown sort type: ${sortType}`);
        return;
    }

    // 保持选中状态
    const selectedTaskId = state.tasks.find((task) => task.selected)?.id;
    if (selectedTaskId) {
      sortedTasks = sortedTasks.map((task) => ({
        ...task,
        selected: task.id === selectedTaskId,
      }));
    }

    this.updateState({ tasks: sortedTasks }, 'sort-tasks');
    logger.info('TaskCrudManager', `Sorted tasks by ${sortType}`);
  }

  /**
   * 插入新行到内容下方
   */
  insertNewLineBelow(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask) return;

    const currentContent = selectedTask.content || '';
    const lines = currentContent.split('\n');
    const currentLine = selectedTask.cursorLine || 0;

    // 在当前行下方插入新行
    lines.splice(currentLine + 1, 0, '');
    const newContent = lines.join('\n');

    const newTasks = state.tasks.map((task) =>
      task.id === selectedTask.id
        ? {
            ...task,
            content: newContent,
            cursorLine: currentLine + 1,
            cursorColumn: 0,
          }
        : task
    );

    this.updateState({ tasks: newTasks }, 'insert-new-line-below');
    logger.info(
      'TaskCrudManager',
      `Inserted new line below for task ${selectedTask.id}`
    );
  }
}
