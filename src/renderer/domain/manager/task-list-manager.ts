/**
 * TaskListManager —— 组合 operations，提供统一的任务管理入口
 */

import { Task, TaskState } from '../task';
import { TaskList } from '../entities/task-list';
import {
  createTask, deleteSelected, toggleComplete, toggleFlag, updateProperty, updateCursor,
  startTitleEditing, sortTasks, copySelected, pasteTask,
  insertNewLineBelow, insertLineAbove, deleteLineAtCursor, moveCursorUp, moveCursorDown, moveCursorLeft, moveCursorRight,
  deleteCharAtCursor, deleteCharBeforeCursor, deleteWordForward, deleteWordBackward, deleteWordEnd,
  deleteToLineEnd, deleteToLineStart, deleteToFirstLine, deleteToLastLine, mergeLineBelow,
  replaceCharAtCursor, swapCaseAtCursor, copyTextAtCursor, pasteTextAtCursor, pasteExternalText,
  getBlockSelection, deleteBlock,
  indentTask, unindentTask,
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

  /** 配置面板跟随选中任务：导航时把 configState 从原任务迁移到新选中任务（j/k 保持任务级移动语义） */
  private migrateConfigState(fromId: number | undefined, toId: number | undefined): void {
    if (fromId === undefined || toId === undefined || fromId === toId) return;
    const from = this.list.items.find((t) => t.id === fromId);
    const to = this.list.items.find((t) => t.id === toId);
    if (!from || !to || !from.configState) return;
    this.list = this.list.withItems(
      this.list.items.map((t) => {
        if (t.id === fromId) return { ...t, configState: undefined };
        if (t.id === toId) return { ...t, configState: from.configState };
        return t;
      })
    );
  }

  selectTask(id: number): void {
    const fromId = this.list.selected?.id;
    this.list = this.list.selectTask(id);
    this.migrateConfigState(fromId, this.list.selected?.id);
    logger.debug('Manager', `Selected task: ${id}`);
  }

  selectNext(): void {
    const fromId = this.list.selected?.id;
    this.list = this.list.selectNext();
    this.migrateConfigState(fromId, this.list.selected?.id);
    logger.debug('Manager', `Selected task: ${this.list.selected?.id}`);
  }
  selectPrevious(): void {
    const fromId = this.list.selected?.id;
    this.list = this.list.selectPrevious();
    this.migrateConfigState(fromId, this.list.selected?.id);
    logger.debug('Manager', `Selected task: ${this.list.selected?.id}`);
  }
  goToFirst(): void {
    const fromId = this.list.selected?.id;
    this.list = this.list.goToFirst();
    this.migrateConfigState(fromId, this.list.selected?.id);
    logger.debug('Manager', `Selected task: ${this.list.selected?.id}`);
  }
  goToLast(): void {
    const fromId = this.list.selected?.id;
    this.list = this.list.goToLast();
    this.migrateConfigState(fromId, this.list.selected?.id);
    logger.debug('Manager', `Selected task: ${this.list.selected?.id}`);
  }

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
  insertLineAbove(): void { this.list = insertLineAbove(this.list); }
  deleteLineAtCursor(): void { this.list = deleteLineAtCursor(this.list); }
  deleteCharAtCursor(): void { this.list = deleteCharAtCursor(this.list); }
  deleteCharBeforeCursor(): void { this.list = deleteCharBeforeCursor(this.list); }
  deleteWordForward(): void { this.list = deleteWordForward(this.list); }
  deleteWordBackward(): void { this.list = deleteWordBackward(this.list); }
  deleteWordEnd(): void { this.list = deleteWordEnd(this.list); }
  deleteToLineEnd(): void { this.list = deleteToLineEnd(this.list); }
  deleteToLineStart(): void { this.list = deleteToLineStart(this.list); }
  deleteToFirstLine(): void { this.list = deleteToFirstLine(this.list); }
  deleteToLastLine(): void { this.list = deleteToLastLine(this.list); }
  mergeLineBelow(): void { this.list = mergeLineBelow(this.list); }
  replaceCharAtCursor(char: string): void { this.list = replaceCharAtCursor(this.list, char); }
  swapCaseAtCursor(): void { this.list = swapCaseAtCursor(this.list); }
  copyText(kind: 'line' | 'word' | 'toEnd'): string { return copyTextAtCursor(this.list, kind); }
  pasteText(text: string, isLine: boolean, before: boolean): void { this.list = pasteTextAtCursor(this.list, text, isLine, before); }
  /** p/P 粘贴外部文本（系统剪贴板）：字符式多行切行插入 */
  pasteExternal(text: string, before: boolean): void { this.list = pasteExternalText(this.list, text, before); }
  /** 可视块选区（锚点→光标矩形）；无选区返回 null */
  blockSelection(anchorLine: number, anchorCol: number) { return getBlockSelection(this.list, anchorLine, anchorCol); }
  /** 可视块删除，光标落块左上角 */
  deleteBlock(anchorLine: number, anchorCol: number): void { this.list = deleteBlock(this.list, anchorLine, anchorCol); }
  indentTask(id: number): void { this.list = indentTask(this.list, id); }
  unindentTask(id: number): void { this.list = unindentTask(this.list, id); }

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
