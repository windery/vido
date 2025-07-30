/**
 * 任务操作管理器
 * 负责任务的增删改查、复制粘贴等基础操作
 */

import { Task, TaskState, TaskPriority } from '../task';
import { TaskDataState } from './task-data-manager';
import { logger } from '../../utils/logger';

export class TaskOperations {
  constructor(
    private getState: () => TaskDataState,
    private updateState: (updates: Partial<TaskDataState>) => void
  ) {}

  /**
   * 生成新的任务ID
   */
  generateId(): number {
    const state = this.getState();
    const newId = state.maxId;
    this.updateState({ maxId: newId + 1 });
    return newId;
  }

  /**
   * 创建新任务
   */
  createNewTask(title: string = '', insertAfter: boolean = true): Task {
    const state = this.getState();
    const newTask = new Task(this.generateId());
    newTask.title = title;
    newTask.content = '';
    newTask.completed = false;
    newTask.priority = TaskPriority.MEDIUM;
    newTask.tags = [];
    newTask.schedule = undefined;
    newTask.selected = true;
    newTask.status = TaskState.TITLE_EDITING;
    newTask.cursorLine = 0;
    newTask.cursorColumn = 0;

    const tasks = [...state.tasks];
    const selectedIndex = tasks.findIndex((task) => task.selected);

    // 取消其他任务的选中状态
    tasks.forEach((task) => {
      task.selected = false;
      task.status = TaskState.VIEWING;
    });

    // 插入新任务
    if (selectedIndex >= 0 && insertAfter) {
      tasks.splice(selectedIndex + 1, 0, newTask);
    } else if (selectedIndex >= 0 && !insertAfter) {
      tasks.splice(selectedIndex, 0, newTask);
    } else {
      tasks.push(newTask);
    }

    this.updateState({
      tasks,
      selectedTaskId: newTask.id,
    });

    logger.info('TaskOperations', `Created new task: ${newTask.id}`);
    return newTask;
  }

  /**
   * 删除选中的任务
   */
  deleteSelectedTask(): void {
    const state = this.getState();
    const tasks = [...state.tasks];
    const selectedIndex = tasks.findIndex((task) => task.selected);

    if (selectedIndex === -1) {
      logger.warn('TaskOperations', 'No task selected for deletion');
      return;
    }

    const deletedTask = tasks[selectedIndex];
    tasks.splice(selectedIndex, 1);

    // 选择下一个任务
    let newSelectedTaskId: number | undefined;
    if (tasks.length > 0) {
      const newSelectedIndex = Math.min(selectedIndex, tasks.length - 1);
      tasks[newSelectedIndex].selected = true;
      tasks[newSelectedIndex].status = TaskState.VIEWING;
      newSelectedTaskId = tasks[newSelectedIndex].id;
    }

    this.updateState({
      tasks,
      selectedTaskId: newSelectedTaskId,
    });

    logger.info('TaskOperations', `Deleted task: ${deletedTask.id}`);
  }

  /**
   * 复制选中的任务
   */
  copySelectedTask(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask) {
      logger.warn('TaskOperations', 'No task selected for copying');
      return;
    }

    // 创建任务副本（不包含ID）
    const taskCopy = new Task(0); // 临时ID，粘贴时会重新生成
    taskCopy.title = selectedTask.title;
    taskCopy.content = selectedTask.content;
    taskCopy.completed = selectedTask.completed;
    taskCopy.priority = selectedTask.priority;
    taskCopy.tags = selectedTask.tags ? [...selectedTask.tags] : [];
    taskCopy.schedule = selectedTask.schedule;
    taskCopy.selected = false;
    taskCopy.status = TaskState.VIEWING;

    this.updateState({ clipboard: taskCopy });
    logger.info('TaskOperations', `Copied task: ${selectedTask.id}`);
  }

  /**
   * 粘贴任务
   */
  pasteTask(): void {
    const state = this.getState();
    if (!state.clipboard) {
      logger.warn('TaskOperations', 'No task in clipboard');
      return;
    }

    const newTask = new Task(this.generateId());
    newTask.title = state.clipboard.title;
    newTask.content = state.clipboard.content;
    newTask.completed = state.clipboard.completed;
    newTask.priority = state.clipboard.priority;
    newTask.tags = state.clipboard.tags ? [...state.clipboard.tags] : [];
    newTask.schedule = state.clipboard.schedule;
    newTask.selected = true;
    newTask.status = TaskState.VIEWING;

    const tasks = [...state.tasks];
    const selectedIndex = tasks.findIndex((task) => task.selected);

    // 取消其他任务的选中状态
    tasks.forEach((task) => {
      task.selected = false;
      task.status = TaskState.VIEWING;
    });

    // 在选中任务后插入
    if (selectedIndex >= 0) {
      tasks.splice(selectedIndex + 1, 0, newTask);
    } else {
      tasks.push(newTask);
    }

    this.updateState({
      tasks,
      selectedTaskId: newTask.id,
    });

    logger.info('TaskOperations', `Pasted task: ${newTask.id}`);
  }

  /**
   * 切换任务完成状态
   */
  toggleTaskCompletion(): void {
    const state = this.getState();
    const tasks = [...state.tasks];
    const selectedTask = tasks.find((task) => task.selected);

    if (!selectedTask) {
      logger.warn('TaskOperations', 'No task selected for toggling completion');
      return;
    }

    selectedTask.completed = !selectedTask.completed;

    this.updateState({ tasks });
    logger.info(
      'TaskOperations',
      `Toggled completion for task ${selectedTask.id}: ${selectedTask.completed}`
    );
  }

  /**
   * 排序任务
   */
  sortTasks(sortType: string): void {
    const state = this.getState();
    const tasks = [...state.tasks];

    switch (sortType.toLowerCase()) {
      case 'title':
        tasks.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'priority':
        tasks.sort((a, b) => {
          const priorityOrder = {
            [TaskPriority.HIGH]: 3,
            [TaskPriority.MEDIUM]: 2,
            [TaskPriority.LOW]: 1,
          };
          return (
            (priorityOrder[b.priority || TaskPriority.MEDIUM] || 2) -
            (priorityOrder[a.priority || TaskPriority.MEDIUM] || 2)
          );
        });
        break;
      case 'created':
        // 由于Task没有createdAt字段，按ID排序（ID越小越早创建）
        tasks.sort((a, b) => a.id - b.id);
        break;
      case 'updated':
        // 由于Task没有updatedAt字段，按ID倒序排序
        tasks.sort((a, b) => b.id - a.id);
        break;
      case 'completed':
        tasks.sort((a, b) => {
          if (a.completed === b.completed) return 0;
          return a.completed ? 1 : -1;
        });
        break;
      default:
        logger.warn('TaskOperations', `Unknown sort type: ${sortType}`);
        return;
    }

    this.updateState({ tasks });
    logger.info('TaskOperations', `Sorted tasks by: ${sortType}`);
  }
}
