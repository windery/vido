/**
 * 全局应用状态 Store
 * 组合 TaskListManager + 编辑器模式 + UI 状态
 */

import { reactive } from 'vue';
import { TaskListManager } from '../manager/task-list-manager';
import { TaskList, taskMatchesSearch } from '../entities/task-list';
import { Task } from '../task';
import { EditorMode } from '../editor';
import { StateMachine, deriveTaskState } from '../state-machine';
import { logger } from '../../utils/logger';

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
  private history: { before: Task[]; after: Task[] }[] = [];
  private historyIndex = -1;

  afterChange(cb: () => void): void { this._onChange = cb; }
  private changed(): void { this._onChange?.(); }

  // ======== 撤销 / 重做 ========

  private snap(): Task[] {
    return structuredClone(this.manager.list.items);
  }

  private record(before: Task[]): void {
    const after = this.snap();
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    this.history.splice(this.historyIndex + 1);
    this.history.push({ before, after });
    if (this.history.length > 100) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }

  private restore(items: Task[]): void {
    const searchFilter = this.manager.list.searchFilter;
    this.manager.list = new TaskList(structuredClone(items), searchFilter);
    this.syncSelection();
  }

  /** 包装结构写操作：操作前快照，操作后入历史栈 */
  private mutate(fn: () => void): void {
    const before = this.snap();
    fn();
    this.record(before);
    this.changed();
  }

  undo(): void {
    if (this.historyIndex < 0) return;
    const entry = this.history[this.historyIndex];
    this.historyIndex--;
    this.restore(entry.before);
    this.changed();
    logger.info('Store', 'undo', { step: this.historyIndex, total: this.history.length, tasks: this.manager.list.items });
  }

  redo(): void {
    if (this.historyIndex >= this.history.length - 1) return;
    const entry = this.history[this.historyIndex + 1];
    this.historyIndex++;
    this.restore(entry.after);
    this.changed();
    logger.info('Store', 'redo', { step: this.historyIndex, total: this.history.length, tasks: this.manager.list.items });
  }

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
    this.changed();
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

  // ======== 搜索 ========

  private getSearchTerm(): string {
    const f = this.state.lastlineContent;
    return f && f.startsWith('/') && f.length > 1 ? f.slice(1) : '';
  }

  /** 搜索确认：让选中项落在匹配集合内（vido.html 行为：选中第一个匹配） */
  applySearch(filter?: string): void {
    const term = filter ?? this.getSearchTerm();
    const visible = this.manager.list.items.filter((t) => taskMatchesSearch(t, term));
    if (visible.length > 0 && !visible.some((t) => t.selected)) {
      this.manager.selectTask(visible[0].id);
      this.syncSelection();
    }
    this.changed();
    logger.info('Store', 'search', { term, matches: visible.length, selectedId: this.manager.list.selected?.id });
  }

  /** 清除搜索（Esc / :clear）：清空 lastlineContent 驱动 UI 过滤回退 */
  clearSearch(): void {
    if (this.state.lastlineContent.startsWith('/')) {
      this.state.lastlineContent = '';
    }
    this.changed();
    logger.info('Store', 'clear search');
  }

  /** n / N：跳到下一个/上一个匹配任务 */
  searchNext(dir: number): void {
    const term = this.getSearchTerm();
    const visible = this.manager.list.items.filter((t) => taskMatchesSearch(t, term));
    if (visible.length === 0) return;
    const idx = visible.findIndex((t) => t.selected);
    const nextIdx = (idx + (dir > 0 ? 1 : -1) + visible.length) % visible.length;
    this.manager.selectTask(visible[nextIdx].id);
    this.syncSelection();
    this.changed();
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
  createNewTask(title?: string, after?: boolean): any {
    let result: any;
    this.mutate(() => { result = this.manager.createNewTask(title, after); });
    logger.info('Store', 'create task', { id: result.id, title: result.title });
    return result;
  }
  deleteSelectedTask(): void {
    const task = this.manager.list.selected;
    const id = task?.id;
    const title = task?.title;
    this.mutate(() => this.manager.deleteSelectedTask());
    logger.info('Store', 'delete task', { id, title });
  }
  toggleTaskCompletion(): void {
    this.mutate(() => this.manager.toggleTaskCompletion());
    const task = this.manager.list.selected;
    logger.info('Store', 'toggle complete', { id: task?.id, completed: task?.completed });
  }
  toggleFlag(): void {
    this.mutate(() => this.manager.toggleFlag());
    const task = this.manager.list.selected;
    logger.info('Store', 'toggle flag', { id: task?.id, flagged: task?.flagged });
  }
  updateTaskProperty(id: number, key: string, val: any): void {
    this.manager.updateTaskProperty(id, key, val);
    this.changed();
    logger.info('Store', 'update task', { id, field: key, value: val });
  }
  startTitleEditing(): void { this.manager.startTitleEditing(); this.changed(); }
  startContentNavigation(): void { this.manager.updateSelectedTaskStatus(2); this.changed(); }
  setConfigState(id: number, s: string | undefined): void { this.manager.setConfigState(id, s); this.changed(); }
  updateTaskCursorPosition(id: number, l: number, c: number): void { this.manager.updateTaskCursor(id, l, c); this.changed(); }
  insertNewLineBelow(): void {
    const taskId = this.manager.list.selected?.id;
    this.mutate(() => this.manager.insertNewLineBelow());
    const task = this.manager.list.selected;
    logger.info('Store', 'insert line', { taskId, line: task?.cursorLine });
  }
  moveCursorUp(): void { this.manager.moveCursorUp(); this.changed(); }
  moveCursorDown(): void { this.manager.moveCursorDown(); this.changed(); }
  moveCursorLeft(): void { this.manager.moveCursorLeft(); this.changed(); }
  moveCursorRight(): void { this.manager.moveCursorRight(); this.changed(); }
  moveCursorToLineStart(): void { this.manager.moveCursorToLineStart(); this.changed(); }
  moveCursorToLineEnd(): void { this.manager.moveCursorToLineEnd(); this.changed(); }
  moveCursorToFirstLine(): void { this.manager.moveCursorToFirstLine(); this.changed(); }
  moveCursorToLastLine(): void { this.manager.moveCursorToLastLine(); this.changed(); }
  moveCursorWordForward(): void { this.manager.moveCursorWordForward(); this.changed(); }
  moveCursorWordBackward(): void { this.manager.moveCursorWordBackward(); this.changed(); }
  moveCursorWordEnd(): void { this.manager.moveCursorWordEnd(); this.changed(); }
  sortTasks(type: string): void {
    this.mutate(() => this.manager.sortTasks(type));
    logger.info('Store', 'sort tasks', { type, count: this.manager.list.items.length });
  }
  copySelectedTask(): void { this.manager.copySelectedTask(); }
  pasteTask(): void {
    const fromId = this.manager.clipboard?.sourceId;
    this.mutate(() => this.manager.pasteTask());
    const selected = this.manager.list.selected;
    logger.info('Store', 'paste task', { newId: selected?.id, fromId });
  }
  exitContentNavigation(): void { this.manager.updateSelectedTaskStatus(1); this.changed(); }
  transition(trigger: string, ctx?: any): any { const r = this._transition(trigger, ctx); this.changed(); return r; }
  _transition(trigger: string, _ctx?: any): any {
    const result = this.sm.transition(trigger);
    if (!result.success) return result;
    const newMode = result.transition!.to;
    const hasSelected = this.manager.list.selected !== null;
    this.state.editorMode = newMode;
    this.state.taskState = deriveTaskState(newMode, hasSelected);
    // 让选中任务的 status 与 editorMode 同步，驱动 UI 渲染正确的编辑器形态
    if (hasSelected) {
      this.manager.updateSelectedTaskStatus(deriveTaskState(newMode, hasSelected));
    }
    if (trigger === ':' || trigger === '/') {
      this.state.lastlineVisible = true;
      // 触发符写入 lastlineContent：LastLine 输入框据此剥离前缀显示、
      // 并在执行时还原成 :cmd / /term，否则搜索与命令都会因缺前缀而失效
      this.state.lastlineContent = trigger;
    }
    if (trigger === 'Enter' && this.state.lastlineVisible) this.state.lastlineVisible = false;
    if (trigger === 'Escape') {
      if (this.state.lastlineVisible) this.state.lastlineVisible = false;
      if (this.state.lastlineContent?.startsWith('/')) this.state.lastlineContent = '';
    }
    return { success: true };
  }
  toggleHelp(): void { this.state.isHelpVisible = !this.state.isHelpVisible; this.changed(); }
  saveTasks(): void { this.manager.save(); }
  stopEditing(): void {}
  startEditingAtCursor(): void { this.manager.updateSelectedTaskStatus(4); this.changed(); }
  getDebugInfo(): any { return {}; }
  updateLastlineContent(content: string): void { this.state.lastlineContent = content; this.changed(); }
  updateCursorPosition(line: number, col: number): void { this.state.cursorPosition = { line, column: col }; this.changed(); }
}

export const store = new Store();
