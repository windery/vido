/**
 * 任务选择和导航管理器
 * 负责任务的选择、上下移动、跳转等功能
 */

import { Task, TaskState } from '../task';
import { logger } from '../../utils/logger';

export interface TaskSelectionState {
  tasks: Task[];
  selectedTaskId?: number;
}

export class TaskSelectionManager {
  constructor(
    private getState: () => TaskSelectionState,
    private updateState: (
      updates: Partial<TaskSelectionState>,
      trigger?: string
    ) => void
  ) {}

  /**
   * 选择指定任务
   */
  selectTask(taskId: number): void {
    const state = this.getState();
    const taskExists = state.tasks.find((task) => task.id === taskId);

    if (!taskExists) {
      logger.warn('TaskSelectionManager', `Task ${taskId} not found`);
      return;
    }

    const newTasks = state.tasks.map((task) => ({
      ...task,
      selected: task.id === taskId,
      status: task.id === taskId ? TaskState.SELECTED : TaskState.VIEWING,
    }));

    this.updateState(
      {
        tasks: newTasks,
        selectedTaskId: taskId,
      },
      'select-task'
    );

    logger.info('TaskSelectionManager', `Selected task ${taskId}`);
  }

  /**
   * 选择下一个任务
   */
  async selectNext(): Promise<void> {
    const state = this.getState();
    const currentIndex = state.tasks.findIndex((task) => task.selected);

    if (currentIndex < state.tasks.length - 1) {
      const nextTask = state.tasks[currentIndex + 1];
      this.selectTask(nextTask.id);
    }
  }

  /**
   * 选择上一个任务
   */
  async selectPrevious(): Promise<void> {
    const state = this.getState();
    const currentIndex = state.tasks.findIndex((task) => task.selected);

    if (currentIndex > 0) {
      const prevTask = state.tasks[currentIndex - 1];
      this.selectTask(prevTask.id);
    }
  }

  /**
   * 跳转到第一个任务
   */
  goToFirst(): void {
    const state = this.getState();
    if (state.tasks.length > 0) {
      this.selectTask(state.tasks[0].id);
    }
  }

  /**
   * 跳转到最后一个任务
   */
  goToLast(): void {
    const state = this.getState();
    if (state.tasks.length > 0) {
      this.selectTask(state.tasks[state.tasks.length - 1].id);
    }
  }

  /**
   * 获取当前选中的任务
   */
  get selectedTask(): Task | null {
    const state = this.getState();
    return state.tasks.find((task) => task.selected) || null;
  }

  /**
   * 获取当前选中任务的索引
   */
  get selectedTaskIndex(): number {
    const state = this.getState();
    return state.tasks.findIndex((task) => task.selected);
  }
}
