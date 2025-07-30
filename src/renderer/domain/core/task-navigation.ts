/**
 * 任务导航管理器
 * 负责任务的选择、导航和跳转操作
 */

import { Task, TaskState } from '../task';
import { TaskDataState } from './task-data-manager';
import { logger } from '../../utils/logger';

export class TaskNavigation {
  constructor(
    private getState: () => TaskDataState,
    private updateState: (updates: Partial<TaskDataState>) => void
  ) {}

  /**
   * 选择指定的任务
   */
  selectTask(taskId: number): void {
    const state = this.getState();
    const taskExists = state.tasks.find((task) => task.id === taskId);

    if (!taskExists) {
      logger.warn('TaskNavigation', `Task ${taskId} not found`);
      return;
    }

    // 使用与TaskSelectionManager相同的逻辑，创建新的任务对象以确保响应式更新
    const newTasks = state.tasks.map((task) => ({
      ...task,
      selected: task.id === taskId,
      status: task.id === taskId ? TaskState.SELECTED : TaskState.VIEWING,
    }));

    this.updateState({
      tasks: newTasks,
      selectedTaskId: taskId,
    });

    logger.info('TaskNavigation', `Selected task: ${taskId}`);
  }

  /**
   * 选择下一个任务
   */
  async selectNext(): Promise<void> {
    // 使用过滤后的任务列表进行导航
    const tasks = this.filteredTasks;

    if (tasks.length === 0) return;

    const currentIndex = tasks.findIndex((task) => task.selected);
    const nextIndex = currentIndex < tasks.length - 1 ? currentIndex + 1 : 0;

    if (nextIndex !== currentIndex) {
      this.selectTask(tasks[nextIndex].id);
    }
  }

  /**
   * 选择上一个任务
   */
  async selectPrevious(): Promise<void> {
    // 使用过滤后的任务列表进行导航
    const tasks = this.filteredTasks;

    if (tasks.length === 0) return;

    const currentIndex = tasks.findIndex((task) => task.selected);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : tasks.length - 1;

    if (prevIndex !== currentIndex) {
      this.selectTask(tasks[prevIndex].id);
    }
  }

  /**
   * 跳转到第一个任务
   */
  goToFirst(): void {
    // 使用过滤后的任务列表进行导航
    const tasks = this.filteredTasks;

    if (tasks.length > 0) {
      this.selectTask(tasks[0].id);
    }
  }

  /**
   * 跳转到最后一个任务
   */
  goToLast(): void {
    // 使用过滤后的任务列表进行导航
    const tasks = this.filteredTasks;

    if (tasks.length > 0) {
      this.selectTask(tasks[tasks.length - 1].id);
    }
  }

  /**
   * 开始标题编辑
   */
  startTitleEditing(): void {
    const state = this.getState();
    const selectedTask = state.tasks.find((task) => task.selected);

    if (!selectedTask) {
      logger.warn('TaskNavigation', 'No task selected for title editing');
      return;
    }

    const tasks = [...state.tasks];
    const taskIndex = tasks.findIndex((task) => task.id === selectedTask.id);
    if (taskIndex >= 0) {
      tasks[taskIndex] = { ...tasks[taskIndex] };
      tasks[taskIndex].status = TaskState.TITLE_EDITING;
    }

    this.updateState({ tasks });
    logger.info(
      'TaskNavigation',
      `Started title editing for task ${selectedTask.id}`
    );
  }

  /**
   * 获取选中的任务
   */
  get selectedTask(): Task | null {
    const state = this.getState();
    return state.tasks.find((task) => task.selected) || null;
  }

  /**
   * 获取选中任务的索引
   */
  get selectedTaskIndex(): number {
    const state = this.getState();
    return state.tasks.findIndex((task) => task.selected);
  }

  /**
   * 获取过滤后的任务列表
   */
  get filteredTasks(): Task[] {
    const state = this.getState();
    const filter = state.lastlineContent;

    if (!filter || filter === '' || !filter.startsWith('/')) {
      return state.tasks;
    }

    const searchTerm = filter.slice(1);
    if (searchTerm === '') {
      return state.tasks;
    }

    return state.tasks.filter(
      (task) =>
        task.title.includes(searchTerm) || task.content.includes(searchTerm)
    );
  }

  /**
   * 检查是否在搜索模式
   */
  get isSearching(): boolean {
    const state = this.getState();
    const filter = state.lastlineContent;
    return !!(filter && filter.startsWith('/') && filter.length > 1);
  }
}
