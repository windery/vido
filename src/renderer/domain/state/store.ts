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
  private _onChange: (() => void) | null = null;

  afterChange(cb: () => void): void { this._onChange = cb; }
  private changed(): void { this._onChange?.(); }

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

  get selectedTask(): any { return this.manager.list.selected; }
  get isSearching(): boolean { return this.manager.list.isSearching; }
  get filteredTasks(): any[] { return this.manager.list.all; }

  // 转发 manager 方法（每个写操作后触发 changed）
  selectTask(id: number): void { this.manager.selectTask(id); this.syncSelection(); this.changed(); }
  selectNext(): void { this.manager.selectNext(); this.syncSelection(); this.changed(); }
  selectPrevious(): void { this.manager.selectPrevious(); this.syncSelection(); this.changed(); }
  goToFirst(): void { this.manager.goToFirst(); this.syncSelection(); this.changed(); }
  goToLast(): void { this.manager.goToLast(); this.syncSelection(); this.changed(); }
  createNewTask(title?: string, after?: boolean): any { const r = this.manager.createNewTask(title, after); this.changed(); return r; }
  deleteSelectedTask(): void { this.manager.deleteSelectedTask(); this.changed(); }
  toggleTaskCompletion(): void { this.manager.toggleTaskCompletion(); this.changed(); }
  updateTaskProperty(id: number, key: string, val: any): void { this.manager.updateTaskProperty(id, key, val); this.changed(); }
  startTitleEditing(): void { this.manager.startTitleEditing(); this.changed(); }
  startContentNavigation(): void { this.manager.updateSelectedTaskStatus(4); this.changed(); }
  setConfigState(id: number, s: string | undefined): void { this.manager.setConfigState(id, s); this.changed(); }
  updateTaskCursorPosition(id: number, l: number, c: number): void { this.manager.updateTaskCursor(id, l, c); this.changed(); }
  insertNewLineBelow(): void { this.manager.insertNewLineBelow(); this.changed(); }
  moveCursorUp(): void { this.manager.moveCursorUp(); this.changed(); }
  moveCursorDown(): void { this.manager.moveCursorDown(); this.changed(); }
  moveCursorLeft(): void { this.manager.moveCursorLeft(); this.changed(); }
  moveCursorRight(): void { this.manager.moveCursorRight(); this.changed(); }
  moveCursorToLineStart(): void { this.manager.moveCursorToLineStart(); this.changed(); }
  moveCursorToLineEnd(): void { this.manager.moveCursorToLineEnd(); this.changed(); }
  moveCursorToFirstLine(): void { this.manager.moveCursorToFirstLine(); this.changed(); }
  moveCursorToLastLine(): void { this.manager.moveCursorToLastLine(); this.changed(); }
  moveCursorWordForward(): void {}
  moveCursorWordBackward(): void {}
  moveCursorWordEnd(): void {}
  sortTasks(type: string): void { this.manager.sortTasks(type); this.changed(); }
  copySelectedTask(): void { this.manager.copySelectedTask(); }
  pasteTask(): void { this.manager.pasteTask(); this.changed(); }
  exitContentNavigation(): void { this.manager.updateSelectedTaskStatus(1); this.changed(); }
  transition(trigger: string, ctx?: any): any { const r = this._transition(trigger, ctx); this.changed(); return r; }
  _transition(trigger: string, ctx?: any): any {
    const result = this.sm.transition(trigger);
    if (!result.success) return result;
    const newMode = result.transition!.to;
    const hasSelected = this.manager.list.selected !== null;
    this.state.editorMode = newMode;
    this.state.taskState = deriveTaskState(newMode, hasSelected);
    if (trigger === ':' || trigger === '/') this.state.lastlineVisible = true;
    if (trigger === 'Enter' && this.state.lastlineVisible) this.state.lastlineVisible = false;
    if (trigger === 'Escape' && this.state.lastlineContent?.startsWith('/')) this.state.lastlineContent = '';
    return { success: true };
  }
  toggleHelp(): void { this.state.isHelpVisible = !this.state.isHelpVisible; this.changed(); }
  saveTasks(): void { this.manager.save(); }
  stopEditing(): void {}
  startEditingAtCursor(): void { this.manager.updateSelectedTaskStatus(2); this.changed(); }
  getDebugInfo(): any { return {}; }
  updateLastlineContent(content: string): void { this.state.lastlineContent = content; this.changed(); }
  updateCursorPosition(line: number, col: number): void { this.state.cursorPosition = { line, column: col }; this.changed(); }
}

export const store = new Store();
