/**
 * 全局应用状态 Store
 * 组合 TaskListManager + 编辑器模式 + UI 状态
 */

import { reactive } from 'vue';
import { TaskListManager } from '../manager/task-list-manager';
import { TaskList, taskMatchesSearch } from '../entities/task-list';
import { Task, TaskState } from '../task';
import { EditorMode } from '../editor';
import { StateMachine, deriveTaskState } from '../state-machine';
import { logger } from '../../utils/logger';
import { migrateSchedule } from '../../utils/schedule-helper';
import { Schedule, ScheduleRepeat, ScheduleType } from '../schedule';
import { getCurrentDate, formatDate, parseDate } from '../../utils/date-formatter';
import { collectTasksInRange, calendarGridCells } from '../../utils/calendar';
import { writeSystemClipboard } from '../../utils/clipboard';
import { t } from '../../i18n';

export interface AppState {
  editorMode: EditorMode;
  taskState: number;
  selectedTaskId?: number;
  cursorPosition?: { line: number; column: number };
  lastlineContent: string;
  lastlineVisible: boolean;
  isHelpVisible: boolean;
  /** help 面板范围：normal=主线 / all=全部 / config-{schedule,priority,tags}=配置子态 / content=内容编辑 / calendar=日历 / command=命令 */
  helpScope: 'normal' | 'all' | 'config-schedule' | 'config-priority' | 'config-tags' | 'content' | 'calendar' | 'command';
  flashMessage: string | null;
  /** 未保存变更（状态行 [+] 指示器，vim 语义） */
  dirty: boolean;
  /** 配置面板 nav 态选项序号（1 基；0 = 未进入 nav）：j/k/数字 高亮导航、Enter 选中高亮项 */
  configNavIndex: number;
  /** Ctrl+V 可视块模式：active + 锚点（进入块模式时的光标）；选区 = 锚点 ↔ 当前光标矩形，由纯操作推导 */
  visualBlock: {
    active: boolean;
    anchorLine: number;
    anchorCol: number;
  };
  /** 日期视图（g c 进入）：visible + 粒度（day/week/month）+ 锚点日期 + 网格日焦点（selectedDate）与选中任务；
   *  dayDetail：网格内 Enter 打开的当日详情子视图（Esc 返回网格） */
  calendarView: {
    visible: boolean;
    granularity: 'day' | 'week' | 'month';
    anchor: string;
    selectedDate?: string;
    selectedTaskId?: number;
    dayDetail: boolean;
  };
}

export class Store {
  manager: TaskListManager = new TaskListManager();
  state: AppState;
  private sm = new StateMachine();
  private _onChange: (() => void) | null = null;
  /** taskId/session 用于把一次文本编辑会话内的连续输入合并为一条撤销记录（vim 语义：一次插入 = 一次 u） */
  private history: { before: Task[]; after: Task[]; taskId?: number; session: number }[] = [];
  private historyIndex = -1;
  private editSessionId = 0;
  /** 命令/搜索历史（含 : 或 / 前缀，vim 语义：成功执行的才入栈），供 lastline ↑/↓ 浏览 */
  private lastlineHistory: string[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  afterChange(cb: () => void): void { this._onChange = cb; }
  private changed(): void { this._onChange?.(); }

  /** 防抖自动保存：数据变更后 800ms 写盘，连续操作合并为一次保存 */
  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.manager.save()
        .then(() => {
          this.state.dirty = false;
          this.changed();
        })
        .catch((e) => {
          logger.error('Store', 'auto save failed', { error: e });
          this.setFlashMessage(t('flash.saveFailed'));
        });
    }, 800);
  }

  // ======== 撤销 / 重做 ========

  private snap(): Task[] {
    return structuredClone(this.manager.list.items);
  }

  private record(before: Task[]): boolean {
    const after = this.snap();
    if (JSON.stringify(before) === JSON.stringify(after)) return false;

    const selected = this.manager.list.selected;
    const inTextEdit =
      selected !== null &&
      (selected.status === TaskState.CONTENT_EDITING || selected.status === TaskState.TITLE_EDITING);
    const last = this.history[this.historyIndex];

    // vim 语义：一次编辑会话内的连续输入合并为一条撤销记录（一次插入 = 一次 u）
    if (inTextEdit && last && last.taskId === selected.id && last.session === this.editSessionId) {
      last.after = after;
      return true;
    }

    this.history.splice(this.historyIndex + 1);
    this.history.push({ before, after, taskId: selected?.id, session: this.editSessionId });
    if (this.history.length > 100) this.history.shift();
    this.historyIndex = this.history.length - 1;
    return true;
  }

  private restore(items: Task[]): void {
    // 撤销/重做只还原数据；status 是瞬态编辑态，统一归位，防止 undo 后任务卡在编辑框
    // 例外：撤销前处于 content-nav 导航态（vim normal 编辑操作 x/dd/dw…）时保持导航，
    // 否则块光标（caret-mirror）因 status 归位为 SELECTED 而消失
    const current = this.manager.list.selected;
    const keepNav = current?.status === TaskState.CONTENT_NAVIGATION;
    const normalized = items.map((t) => {
      const status = t.selected
        ? keepNav ? TaskState.CONTENT_NAVIGATION : TaskState.SELECTED
        : TaskState.VIEWING;
      const task = { ...t, status } as Task;
      // structuredClone 丢失 Schedule 原型，须重建，否则渲染时 getDisplayText 崩溃
      if (task.schedule && typeof (task.schedule as any).getDisplayText !== 'function') {
        task.schedule = migrateSchedule(task.schedule as any) || undefined;
      }
      return task;
    });
    this.manager.list = new TaskList(normalized);
    this.syncSelection();
  }

  /** 更新选中任务 status；进入文本编辑态时开新撤销会话，保证各次编辑独立成历史 */
  private setTaskStatus(status: TaskState): void {
    const prev = this.manager.list.selected?.status;
    this.manager.updateSelectedTaskStatus(status);
    if (status !== prev && (status === TaskState.CONTENT_EDITING || status === TaskState.TITLE_EDITING)) {
      this.editSessionId++;
    }
  }

  /** 包装结构写操作：操作前快照，操作后入历史栈，并防抖自动保存 */
  private mutate(fn: () => void): void {
    const before = this.snap();
    fn();
    if (this.record(before)) this.state.dirty = true;
    this.changed();
    this.scheduleSave();
  }

  undo(): void {
    if (this.historyIndex < 0) return;
    const entry = this.history[this.historyIndex];
    this.historyIndex--;
    this.restore(entry.before);
    this.state.dirty = true;
    this.changed();
    this.scheduleSave();
    logger.info('Store', 'undo', { step: this.historyIndex, total: this.history.length, tasks: this.manager.list.items });
  }

  redo(): void {
    if (this.historyIndex >= this.history.length - 1) return;
    const entry = this.history[this.historyIndex + 1];
    this.historyIndex++;
    this.restore(entry.after);
    this.state.dirty = true;
    this.changed();
    this.scheduleSave();
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
      helpScope: 'normal',
      flashMessage: null,
      dirty: false,
      configNavIndex: 0,
      visualBlock: { active: false, anchorLine: 0, anchorCol: 0 },
      calendarView: { visible: false, granularity: 'week', anchor: '', selectedDate: undefined, selectedTaskId: undefined, dayDetail: false },
    });
  }

  // ======== 初始化 ========

  async init(): Promise<void> {
    const saved = await TaskListManager.load();
    if (saved) {
      this.manager = saved;
      // selected 不持久化：加载后若无选中任务，默认选中第一个（vim 打开文件光标在顶部）
      if (this.manager.list.items.length > 0 && !this.manager.list.selected) {
        this.manager.goToFirst();
      }
      this.syncSelection();
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

  /** 设置状态栏瞬时反馈消息，3 秒后自动清除 */
  setFlashMessage(msg: string | null): void {
    this.state.flashMessage = msg;
    this.changed();
    if (this.flashTimer) clearTimeout(this.flashTimer);
    if (msg) {
      this.flashTimer = setTimeout(() => {
        this.flashTimer = null;
        this.state.flashMessage = null;
        this.changed();
      }, 3000);
    }
  }

  // ======== 命令历史 ========

  /** 压入一条命令/搜索历史：去空、与末条相同的连续去重、上限 50 条（丢最旧） */
  pushLastlineHistory(content: string): void {
    const c = content.trim();
    if (!c) return;
    if (this.lastlineHistory[this.lastlineHistory.length - 1] === c) return;
    this.lastlineHistory.push(c);
    if (this.lastlineHistory.length > 50) this.lastlineHistory.shift();
  }

  /** 返回历史副本（防止外部改内部数组） */
  getLastlineHistory(): string[] {
    return [...this.lastlineHistory];
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

  /** vim * / #：以选中任务标题为搜索词，跳到下一个/上一个匹配（无匹配时仅提示，不移动） */
  searchWordUnderCursor(dir: 1 | -1): void {
    const title = this.manager.list.selected?.title?.trim();
    if (!title) return;
    this.state.lastlineContent = '/' + title;
    const visible = this.manager.list.items.filter((t) => taskMatchesSearch(t, title));
    if (visible.length === 0) {
      this.setFlashMessage(t('flash.noMatch'));
      return;
    }
    const idx = visible.findIndex((t) => t.selected);
    const nextIdx = (idx + dir + visible.length) % visible.length;
    this.manager.selectTask(visible[nextIdx].id);
    this.syncSelection();
    this.changed();
    logger.info('Store', 'search word', { term: title, matches: visible.length, selectedId: visible[nextIdx].id });
  }

  // ======== 兼容旧 TaskDataManager API ========

  getState(): any {
    return {
      editorMode: this.state.editorMode,
      taskState: this.state.taskState,
      // 以 manager 的选中任务为唯一事实来源（create/delete/paste/sort 后 state.selectedTaskId 可能滞后，
      // 滞后值会导致 :schedule/cc/i 等键位作用到错误任务——严重 bug）
      selectedTaskId: this.manager.list.selected?.id,
      cursorPosition: this.state.cursorPosition,
      isHelpVisible: this.state.isHelpVisible,
      helpScope: this.state.helpScope,
      lastlineContent: this.state.lastlineContent,
      lastlineVisible: this.state.lastlineVisible,
      flashMessage: this.state.flashMessage,
      configNavIndex: this.state.configNavIndex,
      visualBlock: this.state.visualBlock,
      calendarView: this.state.calendarView,
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
  get filteredTasks(): any[] { return this.manager.list.all; }

  // 转发 manager 方法（每个写操作后触发 changed）
  selectTask(id: number): void { this.resetConfigNav(); this.resetVisualBlock(); this.manager.selectTask(id); this.syncSelection(); this.changed(); }
  /** 搜索激活时 j/k 只在匹配集内移动（所见即所动）；否则全量移动 */
  selectNext(): void {
    this.resetConfigNav();
    this.resetVisualBlock();
    if (this.isSearchActive()) { this.searchNext(1); return; }
    this.manager.selectNext(); this.syncSelection(); this.changed();
  }
  selectPrevious(): void {
    this.resetConfigNav();
    this.resetVisualBlock();
    if (this.isSearchActive()) { this.searchNext(-1); return; }
    this.manager.selectPrevious(); this.syncSelection(); this.changed();
  }
  goToFirst(): void { this.resetConfigNav(); this.resetVisualBlock(); this.manager.goToFirst(); this.syncSelection(); this.changed(); }
  goToLast(): void { this.resetConfigNav(); this.resetVisualBlock(); this.manager.goToLast(); this.syncSelection(); this.changed(); }

  /** nav 高亮是面板瞬态 UI：任务移动时清理，防止高亮残留到其他任务 */
  private resetConfigNav(): void {
    if (this.state.configNavIndex !== 0) this.state.configNavIndex = 0;
  }
  /** 可视块选区绑定当前任务内容，任务移动/退出导航时一并清理 */
  resetVisualBlock(): void {
    if (this.state.visualBlock.active) {
      this.state.visualBlock.active = false;
      this.changed();
    }
  }

  /** 搜索是否激活（lastlineContent 以 / 开头且有词） */
  private isSearchActive(): boolean {
    const f = this.state.lastlineContent;
    return !!(f && f.startsWith('/') && f.length > 1);
  }
  createNewTask(title?: string, after?: boolean): any {
    let result: any;
    this.mutate(() => { result = this.manager.createNewTask(title, after); });
    this.syncSelection();
    logger.info('Store', 'create task', { id: result.id, title: result.title });
    return result;
  }
  deleteSelectedTask(): void {
    const task = this.manager.list.selected;
    const id = task?.id;
    const title = task?.title;
    this.mutate(() => this.manager.deleteSelectedTask());
    this.syncSelection();
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
    this.mutate(() => this.manager.updateTaskProperty(id, key, val));
    logger.info('Store', 'update task', { id, field: key, value: val });
  }

  /** 设置/清除日程重复（ed/ew/em/ey、cd/cw/cm/cy）；无日程时先建今天日程 */
  setScheduleRepeat(taskId: number, repeat: ScheduleRepeat | undefined): void {
    this.mutate(() => {
      const task = this.manager.list.items.find((t) => t.id === taskId);
      const s = task?.schedule;
      if (!s) {
        if (!repeat) return; // 无日程且清 repeat：无操作
        this.manager.updateTaskProperty(
          taskId,
          'schedule',
          new Schedule(ScheduleType.QUICK, { quickTime: { date: getCurrentDate() }, repeat })
        );
        return;
      }
      this.manager.updateTaskProperty(
        taskId,
        'schedule',
        new Schedule(s.type, {
          quickTime: s.quickTime,
          weeklyTime: s.weeklyTime,
          rangeTime: s.rangeTime,
          repeat,
        })
      );
    });
    logger.info('Store', 'set schedule repeat', { taskId, repeat });
  }

  // ============ 日期视图（g c 进入 / H L 切粒度 / [ ] 翻页 / j k 选任务 / Enter 打开） ============

  /** 日历视图内可见条目（按日期分组展开后拍平，含 repeat 出现；搜索激活时同样过滤） */
  private calendarEntries(): Array<{ date: string; task: Task }> {
    const term = this.getSearchTerm();
    const base = term
      ? this.manager.list.items.filter((t) => taskMatchesSearch(t, term))
      : this.manager.list.items;
    const days = collectTasksInRange(base, this.state.calendarView.granularity, this.state.calendarView.anchor);
    const out: Array<{ date: string; task: Task }> = [];
    for (const d of days) {
      for (const t of d.tasks) out.push({ date: d.date, task: t });
    }
    return out;
  }

  /** 锚点/粒度变化后校正选中项：同任务优先跟随，否则落在范围内第一项 */
  private syncCalendarSelection(): void {
    const cv = this.state.calendarView;
    const entries = this.calendarEntries();
    if (entries.length === 0) {
      cv.selectedDate = undefined;
      cv.selectedTaskId = undefined;
      return;
    }
    const cur = entries.find((e) => e.task.id === cv.selectedTaskId && e.date === cv.selectedDate);
    if (cur) return;
    const sameTask = entries.find((e) => e.task.id === cv.selectedTaskId);
    if (sameTask) {
      cv.selectedDate = sameTask.date;
      return;
    }
    cv.selectedDate = entries[0].date;
    cv.selectedTaskId = entries[0].task.id;
  }

  openCalendarView(): void {
    const today = getCurrentDate();
    const selected = this.manager.list.selected;
    // 锚点：当前选中任务有日程则用其日期，否则今天
    let anchor = today;
    const sd = selected?.schedule;
    if (sd) {
      const d = (sd as any).getShortText ? sd.getShortText() : '';
      if (d && /^\d{4}-\d{2}-\d{2}/.test(d)) anchor = d.slice(0, 10);
    }
    this.state.calendarView = { visible: true, granularity: 'week', anchor, selectedDate: undefined, selectedTaskId: undefined, dayDetail: false };
    // 预选：当前选中任务在范围内的首次出现，否则范围内第一个条目（Enter 即可直接打开）
    const entries = this.calendarEntries();
    if (entries.length > 0) {
      const pick = entries.find((e) => e.task.id === selected?.id) ?? entries[0];
      this.state.calendarView.selectedDate = pick.date;
      this.state.calendarView.selectedTaskId = pick.task.id;
    }
    logger.info('Store', 'open calendar view', { anchor, granularity: 'week' });
  }

  closeCalendarView(): void {
    this.state.calendarView.visible = false;
    logger.info('Store', 'close calendar view');
  }

  cycleCalendarGranularity(dir: 1 | -1): void {
    const order: Array<'day' | 'week' | 'month'> = ['day', 'week', 'month'];
    const cur = this.state.calendarView.granularity;
    const idx = order.indexOf(cur);
    const next = order[(idx + dir + order.length) % order.length];
    this.state.calendarView.granularity = next;
    this.state.calendarView.dayDetail = false; // 切粒度回到网格
    this.syncCalendarSelection();
    this.changed();
  }

  shiftCalendarPage(dir: 1 | -1): void {
    const cv = this.state.calendarView;
    const d = parseDate(cv.anchor) || new Date();
    if (cv.granularity === 'day') d.setDate(d.getDate() + dir);
    else if (cv.granularity === 'week') d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    cv.anchor = formatDate(d);
    cv.dayDetail = false; // 翻页回到网格
    this.syncCalendarSelection();
    this.changed();
  }

  /** 某日期在视图内的任务（repeat 展开、搜索过滤后） */
  private calendarTasksOn(date: string): Task[] {
    const term = this.getSearchTerm();
    const base = term
      ? this.manager.list.items.filter((t) => taskMatchesSearch(t, term))
      : this.manager.list.items;
    const days = collectTasksInRange(base, this.state.calendarView.granularity, this.state.calendarView.anchor);
    return days.find((d) => d.date === date)?.tasks ?? [];
  }

  /** 网格内 j/k：移动日焦点（沿日期组件格序，含邻月淡化格），自动选中该日第一个任务 */
  moveCalendarFocus(dir: 1 | -1): void {
    const cv = this.state.calendarView;
    const cells = calendarGridCells(cv.granularity, cv.anchor);
    if (cells.length === 0) return;
    let idx = cells.indexOf(cv.selectedDate ?? '');
    if (idx < 0) idx = 0;
    const next = cells[(idx + dir + cells.length) % cells.length];
    cv.selectedDate = next;
    cv.selectedTaskId = this.calendarTasksOn(next)[0]?.id;
    this.changed();
  }

  /** 当日详情内 j/k：在聚焦日的任务间移动选择 */
  moveCalendarDaySelection(dir: 1 | -1): void {
    const cv = this.state.calendarView;
    const date = cv.granularity === 'day' ? cv.anchor : (cv.selectedDate ?? cv.anchor);
    const tasks = this.calendarTasksOn(date);
    cv.selectedDate = date;
    if (tasks.length === 0) {
      cv.selectedTaskId = undefined;
      this.changed();
      return;
    }
    const idx = tasks.findIndex((t) => t.id === cv.selectedTaskId);
    const nextIdx = idx < 0 ? 0 : (idx + dir + tasks.length) % tasks.length;
    cv.selectedTaskId = tasks[nextIdx].id;
    this.changed();
  }

  /** 网格内 Enter：打开聚焦日的任务详情列表 */
  openCalendarDayDetail(): void {
    const cv = this.state.calendarView;
    const date = cv.granularity === 'day' ? cv.anchor : (cv.selectedDate ?? cv.anchor);
    cv.selectedDate = date;
    const tasks = this.calendarTasksOn(date);
    if (cv.selectedTaskId === undefined || !tasks.some((t) => t.id === cv.selectedTaskId)) {
      cv.selectedTaskId = tasks[0]?.id;
    }
    cv.dayDetail = true;
    this.changed();
    logger.info('Store', 'open calendar day detail', { date, tasks: tasks.length });
  }

  /** 详情内 Esc：返回日期网格 */
  closeCalendarDayDetail(): void {
    this.state.calendarView.dayDetail = false;
    this.changed();
  }

  /** Enter：退出日期视图并选中视图内当前任务（任务列表随之滚动到该任务） */
  selectCalendarTask(): void {
    const id = this.state.calendarView.selectedTaskId;
    this.state.calendarView.visible = false;
    if (id !== undefined) {
      this.manager.selectTask(id);
      this.syncSelection();
    }
    this.changed();
    logger.info('Store', 'open task from calendar', { taskId: id });
  }
  startTitleEditing(): void { this.manager.startTitleEditing(); this.changed(); }
  startContentNavigation(): void { this.setTaskStatus(TaskState.CONTENT_NAVIGATION); this.changed(); }
  setConfigState(id: number, s: string | undefined): void {
    // 关闭/切换配置 section 时清理残留的 nav 导航高亮
    this.resetConfigNav();
    this.manager.setConfigState(id, s);
    this.changed();
  }
  /** 配置面板 nav 态选项序号（1 基；0 = 退出 nav），由 ConfigKeyHandler 写入，驱动面板高亮 */
  setConfigNavIndex(n: number): void { this.state.configNavIndex = n; this.changed(); }
  updateTaskCursorPosition(id: number, l: number, c: number): void { this.manager.updateTaskCursor(id, l, c); this.changed(); }
  insertNewLineBelow(): void {
    const taskId = this.manager.list.selected?.id;
    this.mutate(() => this.manager.insertNewLineBelow());
    const task = this.manager.list.selected;
    logger.info('Store', 'insert line', { taskId, line: task?.cursorLine });
  }
  insertLineAbove(): void {
    const taskId = this.manager.list.selected?.id;
    this.mutate(() => this.manager.insertLineAbove());
    const task = this.manager.list.selected;
    logger.info('Store', 'insert line', { taskId, line: task?.cursorLine, dir: 'above' });
  }
  deleteLineAtCursor(): void {
    const taskId = this.manager.list.selected?.id;
    const line = this.manager.list.selected?.cursorLine;
    this.mutate(() => this.manager.deleteLineAtCursor());
    logger.info('Store', 'delete line', { taskId, line });
  }

  // ============ content-nav vim 编辑操作 ============

  private contentClipboard: { text: string; isLine: boolean } | null = null;

  deleteCharAtCursor(): void { const id = this.manager.list.selected?.id; this.mutate(() => this.manager.deleteCharAtCursor()); logger.info('Store', 'delete char', { taskId: id }); }
  deleteCharBeforeCursor(): void { const id = this.manager.list.selected?.id; this.mutate(() => this.manager.deleteCharBeforeCursor()); logger.info('Store', 'delete char before', { taskId: id }); }
  deleteWordForward(): void { const id = this.manager.list.selected?.id; this.mutate(() => this.manager.deleteWordForward()); logger.info('Store', 'delete word', { taskId: id, dir: 'forward' }); }
  deleteWordBackward(): void { const id = this.manager.list.selected?.id; this.mutate(() => this.manager.deleteWordBackward()); logger.info('Store', 'delete word', { taskId: id, dir: 'backward' }); }
  deleteWordEnd(): void { const id = this.manager.list.selected?.id; this.mutate(() => this.manager.deleteWordEnd()); logger.info('Store', 'delete word', { taskId: id, dir: 'end' }); }
  deleteToLineEnd(): void { const id = this.manager.list.selected?.id; this.mutate(() => this.manager.deleteToLineEnd()); logger.info('Store', 'delete to line end', { taskId: id }); }
  deleteToLineStart(): void { const id = this.manager.list.selected?.id; this.mutate(() => this.manager.deleteToLineStart()); logger.info('Store', 'delete to line start', { taskId: id }); }
  deleteToFirstLine(): void { const id = this.manager.list.selected?.id; this.mutate(() => this.manager.deleteToFirstLine()); logger.info('Store', 'delete to first line', { taskId: id }); }
  deleteToLastLine(): void { const id = this.manager.list.selected?.id; this.mutate(() => this.manager.deleteToLastLine()); logger.info('Store', 'delete to last line', { taskId: id }); }
  mergeLineBelow(): void { const id = this.manager.list.selected?.id; this.mutate(() => this.manager.mergeLineBelow()); logger.info('Store', 'merge line', { taskId: id }); }
  replaceCharAtCursor(char: string): void { const id = this.manager.list.selected?.id; this.mutate(() => this.manager.replaceCharAtCursor(char)); logger.info('Store', 'replace char', { taskId: id }); }
  swapCaseAtCursor(): void { const id = this.manager.list.selected?.id; this.mutate(() => this.manager.swapCaseAtCursor()); logger.info('Store', 'swap case', { taskId: id }); }

  // 内容剪贴板（y 复制 / p 粘贴）
  copyLine(): void { this.setContentClipboard(this.manager.copyText('line'), true); }
  copyWord(): void { this.setContentClipboard(this.manager.copyText('word'), false); }
  copyToLineEnd(): void { this.setContentClipboard(this.manager.copyText('toEnd'), false); }
  pasteAfter(): void { const cb = this.contentClipboard; if (cb) { const id = this.manager.list.selected?.id; this.mutate(() => this.manager.pasteText(cb.text, cb.isLine, false)); logger.info('Store', 'paste content', { taskId: id }); } }
  pasteBefore(): void { const cb = this.contentClipboard; if (cb) { const id = this.manager.list.selected?.id; this.mutate(() => this.manager.pasteText(cb.text, cb.isLine, true)); logger.info('Store', 'paste content', { taskId: id }); } }
  /** p/P 粘贴外部文本（系统剪贴板）：字符式多行切行插入 */
  pasteTextRaw(text: string, before: boolean): void {
    if (!text) return;
    const id = this.manager.list.selected?.id;
    this.mutate(() => this.manager.pasteExternal(text, before));
    logger.info('Store', 'paste content', { taskId: id, source: 'system', chars: text.length });
  }

  /** yank 统一入口：写内部缓冲并尽力写回系统剪贴板（vim clipboard=unnamedplus 语义） */
  private setContentClipboard(text: string, isLine: boolean): void {
    this.contentClipboard = { text, isLine };
    writeSystemClipboard(text);
  }

  // ============ Ctrl+V 可视块模式 ============

  /** 进入可视块模式：锚点 = 当前光标 */
  startVisualBlock(): void {
    const t = this.manager.list.selected;
    this.state.visualBlock = {
      active: true,
      anchorLine: t?.cursorLine ?? 0,
      anchorCol: t?.cursorColumn ?? 0,
    };
    this.changed();
    logger.info('Store', 'start visual block', { anchorLine: this.state.visualBlock.anchorLine, anchorCol: this.state.visualBlock.anchorCol });
  }

  endVisualBlock(): void {
    if (!this.state.visualBlock.active) return;
    this.state.visualBlock.active = false;
    this.changed();
  }

  /** y：复制可视块（内部缓冲 + 系统剪贴板），退出块模式 */
  copyVisualBlock(): void {
    const vb = this.state.visualBlock;
    if (!vb.active) return;
    const sel = this.manager.blockSelection(vb.anchorLine, vb.anchorCol);
    this.endVisualBlock();
    if (!sel) return;
    this.setContentClipboard(sel.text, true);
    logger.info('Store', 'copy block', { lines: sel.endLine - sel.startLine + 1, chars: sel.text.length });
  }

  /** x/d：删除可视块（内容入内部缓冲 + 系统剪贴板），光标落块左上角，退出块模式 */
  deleteVisualBlock(): void {
    const vb = this.state.visualBlock;
    if (!vb.active) return;
    const id = this.manager.list.selected?.id;
    const sel = this.manager.blockSelection(vb.anchorLine, vb.anchorCol);
    this.mutate(() => this.manager.deleteBlock(vb.anchorLine, vb.anchorCol));
    this.endVisualBlock();
    if (sel) this.setContentClipboard(sel.text, true);
    logger.info('Store', 'delete block', { taskId: id, lines: (sel?.endLine ?? 0) - (sel?.startLine ?? 0) + 1 });
  }

  /** c：删除可视块后进入插入（编辑态转换由 handler 负责） */
  changeVisualBlock(): void { this.deleteVisualBlock(); }

  // ============ 子任务缩进（tab / Shift+Tab） ============

  indentSelectedTask(): void {
    const id = this.manager.list.selected?.id;
    if (id === undefined) return;
    const before = this.manager.list.selected?.indent ?? 0;
    this.mutate(() => this.manager.indentTask(id));
    const after = this.manager.list.selected?.indent ?? 0;
    if (after !== before) logger.info('Store', 'indent task', { taskId: id, indent: after });
  }

  unindentSelectedTask(): void {
    const id = this.manager.list.selected?.id;
    if (id === undefined) return;
    const before = this.manager.list.selected?.indent ?? 0;
    this.mutate(() => this.manager.unindentTask(id));
    const after = this.manager.list.selected?.indent ?? 0;
    if (after !== before) logger.info('Store', 'unindent task', { taskId: id, indent: after });
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
    this.syncSelection();
    logger.info('Store', 'sort tasks', { type, count: this.manager.list.items.length });
  }
  copySelectedTask(): void { this.manager.copySelectedTask(); }
  pasteTask(): void {
    const fromId = this.manager.clipboard?.sourceId;
    this.mutate(() => this.manager.pasteTask());
    this.syncSelection();
    const selected = this.manager.list.selected;
    logger.info('Store', 'paste task', { newId: selected?.id, fromId });
  }
  exitContentNavigation(): void { this.setTaskStatus(TaskState.SELECTED); this.changed(); }
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
      this.setTaskStatus(deriveTaskState(newMode, hasSelected));
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
      // 退出导航/编辑时清理可视块选区（changed 由 transition 统一触发）
      if (this.state.visualBlock.active) this.state.visualBlock.active = false;
    }
    return { success: true };
  }
  /** 打开/关闭 help 面板；打开时按调用场景设置范围（配置/内容/日历/命令/常规/全部） */
  toggleHelp(scope: 'normal' | 'all' | 'config-schedule' | 'config-priority' | 'config-tags' | 'content' | 'calendar' | 'command' = 'normal'): void {
    if (this.state.isHelpVisible) {
      this.state.isHelpVisible = false;
    } else {
      this.state.isHelpVisible = true;
      this.state.helpScope = scope;
    }
    this.changed();
  }
  async saveTasks(): Promise<void> {
    try {
      await this.manager.save();
      this.state.dirty = false;
      this.changed();
    } catch (e) {
      logger.error('Store', 'save failed', { error: e });
      this.setFlashMessage(t('flash.saveFailed'));
    }
  }
  updateLastlineContent(content: string): void { this.state.lastlineContent = content; this.changed(); }
  updateCursorPosition(line: number, col: number): void { this.state.cursorPosition = { line, column: col }; this.changed(); }
}

export const store = new Store();
