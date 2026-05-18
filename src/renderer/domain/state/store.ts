/**
 * 全局应用状态 Store
 * 组合 TaskListManager + 编辑器模式 + UI 状态
 */

import { reactive } from 'vue';
import { Task } from '../task';
import { TaskList } from '../entities/task-list';
import { TaskListManager } from '../manager/task-list-manager';
import { EditorMode } from '../editor';
import { StateMachine, deriveTaskState } from '../state-machine';
import { logger } from '../../utils/logger';
import { setMaxId } from '../operations/task-crud';

export interface AppState {
  editorMode: EditorMode;
  taskState: number;
  selectedTaskId?: number;
  cursorPosition?: { line: number; column: number };
  lastlineContent: string;
  lastlineVisible: boolean;
  isHelpVisible: boolean;
}

export class Store {
  manager: TaskListManager = new TaskListManager();
  state: AppState;
  private sm = new StateMachine();

  constructor() {
    this.state = reactive({
      editorMode: EditorMode.COMMAND,
      taskState: 0,
      selectedTaskId: undefined,
      cursorPosition: undefined,
      lastlineContent: '',
      lastlineVisible: false,
      isHelpVisible: false,
    });
  }

  // ======== 初始化 ========

  async init(): Promise<void> {
    const saved = await TaskListManager.load();
    if (saved) {
      this.manager = saved;
      logger.info('Store', `Loaded ${this.manager.list.items.length} tasks`);
    }
  }

  // ======== 状态转换 ========

  transition(trigger: string, context?: any): { success: boolean; error?: string } {
    const result = this.sm.transition(trigger);
    if (!result.success) return result;

    const newEditorMode = result.transition!.to;
    const hasSelected = this.manager.list.selected !== null;
    const newTaskState = deriveTaskState(newEditorMode, hasSelected);

    this.state.editorMode = newEditorMode;
    this.state.taskState = newTaskState;

    // 同步任务状态
    if (newEditorMode === EditorMode.COMMAND && trigger === 'Escape') {
      this.manager.updateSelectedTaskStatus(newTaskState);
    }

    logger.info('Store', `Transition: ${trigger} → ${EditorMode[newEditorMode]}`);

    if (trigger === ':' || trigger === '/') {
      this.state.lastlineVisible = true;
    }
    if (trigger === 'Enter' && this.state.lastlineVisible) {
      this.state.lastlineVisible = false;
    }
    if (trigger === 'Escape' && this.state.lastlineContent?.startsWith('/')) {
      this.state.lastlineContent = '';
    }

    return { success: true };
  }

  toggleHelp(): void {
    this.state.isHelpVisible = !this.state.isHelpVisible;
  }

  // ======== 任务选择同步 ========

  syncSelection(): void {
    this.state.selectedTaskId = this.manager.list.selected?.id;
  }

  syncCursor(): void {
    const task = this.manager.list.selected;
    if (task) {
      this.state.cursorPosition = { line: task.cursorLine ?? 0, column: task.cursorColumn ?? 0 };
    }
  }

  // ======== 兼容旧 TaskDataManager API ========

  getState(): any {
    return {
      editorMode: this.state.editorMode,
      taskState: this.state.taskState,
      selectedTaskId: this.state.selectedTaskId ?? this.manager.list.selected?.id,
      cursorPosition: this.state.cursorPosition,
      isHelpVisible: this.state.isHelpVisible,
      lastlineContent: this.state.lastlineContent,
      lastlineVisible: this.state.lastlineVisible,
      tasks: this.manager.list.items,
    };
  }

  getTaskDataState(): any {
    return {
      ...this.getState(),
      maxId: this.manager.maxId,
      clipboard: this.manager.clipboard,
      tasks: this.manager.list.items,
    };
  }

  async saveTasks(): Promise<void> {
    await this.manager.save();
  }

  get selectedTask(): any { return this.manager.list.selected; }
  get isSearching(): boolean { return this.manager.list.isSearching; }
  get filteredTasks(): any[] { return this.manager.list.all; }

  // 转发 manager 方法
  selectTask(id: number): void { this.manager.selectTask(id); this.syncSelection(); }
  selectNext(): void { this.manager.selectNext(); this.syncSelection(); }
  selectPrevious(): void { this.manager.selectPrevious(); this.syncSelection(); }
  goToFirst(): void { this.manager.goToFirst(); this.syncSelection(); }
  goToLast(): void { this.manager.goToLast(); this.syncSelection(); }
  createNewTask(title?: string, after?: boolean): any { return this.manager.createNewTask(title, after); }
  deleteSelectedTask(): void { this.manager.deleteSelectedTask(); }
  toggleTaskCompletion(): void { this.manager.toggleTaskCompletion(); }
  updateTaskProperty(id: number, key: string, val: any): void { this.manager.updateTaskProperty(id, key, val); }
  startTitleEditing(): void { this.manager.startTitleEditing(); }
  startContentNavigation(): void { this.manager.updateSelectedTaskStatus(4); }
  setConfigState(id: number, s: string | undefined): void { this.manager.setConfigState(id, s); }
  updateTaskCursorPosition(id: number, l: number, c: number): void { this.manager.updateTaskCursor(id, l, c); }
  insertNewLineBelow(): void { this.manager.insertNewLineBelow(); }
  moveCursorUp(): void { this.manager.moveCursorUp(); }
  moveCursorDown(): void { this.manager.moveCursorDown(); }
  moveCursorLeft(): void { this.manager.moveCursorLeft(); }
  moveCursorRight(): void { this.manager.moveCursorRight(); }
  moveCursorToLineStart(): void { this.manager.moveCursorToLineStart(); }
  moveCursorToLineEnd(): void { this.manager.moveCursorToLineEnd(); }
  moveCursorToFirstLine(): void { this.manager.moveCursorToFirstLine(); }
  moveCursorToLastLine(): void { this.manager.moveCursorToLastLine(); }
  moveCursorWordForward(): void {} // TODO: implement word nav
  moveCursorWordBackward(): void {}
  moveCursorWordEnd(): void {}
  sortTasks(type: string): void { this.manager.sortTasks(type); }
  copySelectedTask(): void { this.manager.copySelectedTask(); }
  pasteTask(): void { this.manager.pasteTask(); }
  exitContentNavigation(): void { this.manager.updateSelectedTaskStatus(1); }
  stopEditing(): void { /* no-op */ }
  startEditingAtCursor(): void { this.manager.updateSelectedTaskStatus(2); }
  getDebugInfo(): any { return {}; }
  updateLastlineContent(content: string): void { this.state.lastlineContent = content; }
  updateCursorPosition(line: number, col: number): void { this.state.cursorPosition = { line, column: col }; }
}

export const store = new Store();
