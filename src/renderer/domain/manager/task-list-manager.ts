/**
 * TaskListManager —— 组合 operations，提供统一的任务管理入口
 */

import { Task, TaskState } from '../task';
import { TaskList } from '../entities/task-list';
import {
  createTask, deleteSelected, toggleComplete, toggleFlag, updateProperty, updateCursor,
  startTitleEditing, sortTasks, copySelected, pasteTask,
  insertNewLineBelow, moveCursorUp, moveCursorDown, moveCursorLeft, moveCursorRight,
  moveCursorToLineStart, moveCursorToLineEnd, moveCursorToFirstLine, moveCursorToLastLine,
  moveCursorWordForward, moveCursorWordBackward, moveCursorWordEnd,
} from '../operations/task-crud';
import { saveTasks, loadTasks } from '../operations/task-persistence';
import { logger } from '../../utils/logger';

export class TaskListManager {
  list: TaskList;
  maxId: number;
  clipboard: Task | null = null;

  constructor(list: TaskList = new TaskList([]), maxId: number = 1) {
    this.list = list;
    this.maxId = maxId;
  }

  // ======== 导航 ========

  selectTask(id: number): void {
    this.list = this.list.selectTask(id);
    logger.debug('Manager', `Selected task: ${id}`);
  }

  selectNext(): void { this.list = this.list.selectNext(); logger.debug('Manager', `Selected task: ${this.list.selected?.id}`); }
  selectPrevious(): void { this.list = this.list.selectPrevious(); logger.debug('Manager', `Selected task: ${this.list.selected?.id}`); }
  goToFirst(): void { this.list = this.list.goToFirst(); logger.debug('Manager', `Selected task: ${this.list.selected?.id}`); }
  goToLast(): void { this.list = this.list.goToLast(); logger.debug('Manager', `Selected task: ${this.list.selected?.id}`); }

  // ======== CRUD ========

  createNewTask(title: string = '', insertAfter: boolean = true): Task {
    const result = createTask(this.list, title, insertAfter);
    this.list = result.list;
    this.maxId = Math.max(this.maxId, result.task.id);
    return result.task;
  }

  deleteSelectedTask(): void {
    this.list = deleteSelected(this.list);
  }

  toggleTaskCompletion(): void {
    this.list = toggleComplete(this.list);
  }

  toggleFlag(): void {
    this.list = toggleFlag(this.list);
  }

  updateTaskProperty(taskId: number, key: string, value: any): void {
    this.list = updateProperty(this.list, taskId, key, value);
  }

  updateTaskCursor(taskId: number, line: number, col: number): void {
    this.list = updateCursor(this.list, taskId, line, col);
  }

  startTitleEditing(): void {
    this.list = startTitleEditing(this.list);
  }

  sortTasks(type: string): void {
    this.list = sortTasks(this.list, type);
  }

  copySelectedTask(): void {
    const result = copySelected(this.list);
    this.clipboard = result.clipboard;
  }

  pasteTask(): void {
    const result = pasteTask(this.list, this.clipboard);
    this.list = result.list;
  }

  insertNewLineBelow(): void {
    this.list = insertNewLineBelow(this.list);
  }

  // ======== 光标移动 ========

  moveCursorUp(): void { this.list = moveCursorUp(this.list); }
  moveCursorDown(): void { this.list = moveCursorDown(this.list); }
  moveCursorLeft(): void { this.list = moveCursorLeft(this.list); }
  moveCursorRight(): void { this.list = moveCursorRight(this.list); }
  moveCursorToLineStart(): void { this.list = moveCursorToLineStart(this.list); }
  moveCursorToLineEnd(): void { this.list = moveCursorToLineEnd(this.list); }
  moveCursorToFirstLine(): void { this.list = moveCursorToFirstLine(this.list); }
  moveCursorToLastLine(): void { this.list = moveCursorToLastLine(this.list); }
  moveCursorWordForward(): void { this.list = moveCursorWordForward(this.list); }
  moveCursorWordBackward(): void { this.list = moveCursorWordBackward(this.list); }
  moveCursorWordEnd(): void { this.list = moveCursorWordEnd(this.list); }

  // ======== 查询 ========

  get selectedTask(): Task | null { return this.list.selected; }
  get filteredTasks(): Task[] { return this.list.all; }
  get isSearching(): boolean { return this.list.isSearching; }

  // ======== 搜索 ========

  setSearch(filter?: string): void {
    this.list = this.list.withSearch(filter);
  }

  // ======== 配置 ========

  setConfigState(taskId: number, state: string | undefined): void {
    this.list = updateProperty(this.list, taskId, 'configState', state);
    logger.info('Manager', `setConfigState: task=${taskId} state=${state || 'closed'}`);
  }

  // ======== 持久化 ========

  async save(): Promise<void> {
    await saveTasks(this.list, this.maxId);
  }

  static async load(): Promise<TaskListManager> {
    const result = await loadTasks();
    if (result) {
      return new TaskListManager(result.list, result.maxId);
    }
    return new TaskListManager();
  }

  // ======== 任务状态管理 ========

  updateSelectedTaskStatus(status: TaskState): void {
    const task = this.list.selected;
    if (task) {
      this.list = updateProperty(this.list, task.id, 'status', status);
    }
  }
}
