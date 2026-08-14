/**
 * 命令模式处理器
 * 支持 vim 风格按键：hjkl 导航、数字前缀（3j/5k/2dd）、多键序列（dd/yy/gg/cc）
 */

import { ModeHandler } from './base-handler';
import { Store } from '../state/store';
import { toggleTheme, prefs } from '../state/prefs';
import { t } from '../../i18n';

export class CommandModeHandler implements ModeHandler {
  private keySequence = '';
  private keySequenceTimeout: ReturnType<typeof setTimeout> | null = null;
  private countPrefix = '';
  private scrollCallback: ((mode?: string) => void) | null = null;
  private pageScrollCallback: ((dir: number, factor: number) => void) | null = null;

  /** 注入滚动回调（mode: nearest/center/top/bottom），替代 window 全局访问 */
  setScrollCallback(cb: (mode?: string) => void): void {
    this.scrollCallback = cb;
  }

  /** 注入翻页回调（dir: 1 下 / -1 上，factor: 0.5 半页 / 1 整页） */
  setPageScrollCallback(cb: (dir: number, factor: number) => void): void {
    this.pageScrollCallback = cb;
  }

  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: Store,
    isInInputField: boolean
  ): boolean {
    if (isInInputField) {
      if (key === 'Escape') {
        event.preventDefault();
        this.blurInputFields();
        return true;
      }
      return false;
    }

    const currentState = taskDataManager.getState();
    const selectedTaskId = currentState.selectedTaskId;

    // 日期视图激活：按键由日历处理（[ ] 翻页 / H L 切粒度 / j k 选任务 / Esc Enter 退出）
    if ((currentState as any).calendarView?.visible) {
      return this.handleCalendarKey(event, key, taskDataManager);
    }

    // 数字前缀累积：3j → 下移 3 个任务
    if (/^[1-9]\d*$/.test(key) && this.keySequence.length === 0) {
      this.countPrefix += key;
      event.preventDefault();
      return true;
    }

    const count = this.countPrefix ? parseInt(this.countPrefix, 10) : 1;

    // Ctrl+R → 重做（vido.html 承诺的撤销/重做对）
    if (event.ctrlKey && key.toLowerCase() === 'r') {
      event.preventDefault();
      taskDataManager.redo();
      this.resetAll();
      return true;
    }

    // Ctrl-D / Ctrl-U 半页、Ctrl-F / Ctrl-B 整页（vim 惯用滚动）
    if (event.ctrlKey && ['d', 'u', 'f', 'b'].includes(key.toLowerCase())) {
      event.preventDefault();
      const dir = key.toLowerCase() === 'd' || key.toLowerCase() === 'f' ? 1 : -1;
      const factor = key.toLowerCase() === 'd' || key.toLowerCase() === 'u' ? 0.5 : 1;
      this.pageScrollCallback?.(dir, factor);
      this.resetAll();
      return true;
    }

    // c + s/p/t → 直接打开特定配置
    if (this.keySequence === 'c') {
      const stateMap: Record<string, string> = { s: 'schedule-select', p: 'priority-select', t: 'tags-select' };
      const configState = stateMap[key];
      if (configState !== undefined) {
        event.preventDefault();
        this.resetAll();
        if (selectedTaskId) taskDataManager.setConfigState(selectedTaskId, configState);
        return true;
      }
    }

    switch (key) {
      case 'Escape':
        if (currentState.lastlineContent?.startsWith('/')) {
          event.preventDefault();
          taskDataManager.transition('Escape');
        }
        this.resetAll();
        return true;

      case 'Tab':
        // tab：选中任务缩进为上一任务的子任务；Shift+Tab 取消缩进
        event.preventDefault();
        if (event.shiftKey) taskDataManager.unindentSelectedTask();
        else taskDataManager.indentSelectedTask();
        return true;

      case 'j':
        event.preventDefault();
        this.repeatAction(() => taskDataManager.selectNext(), count);
        this.scrollToSelectedTask();
        this.resetAll();
        return true;

      case 'k':
        event.preventDefault();
        this.repeatAction(() => taskDataManager.selectPrevious(), count);
        this.scrollToSelectedTask();
        this.resetAll();
        return true;

      // 配置展开时：J/K 在同一任务的配置项间切换（j/k 留给任务级上下移动；纵向列表用纵向键切换 section）
      case 'J':
        event.preventDefault();
        if (selectedTaskId) {
          const task = (currentState as any).tasks?.find((t: any) => t.id === selectedTaskId);
          if (task?.configState) {
            this.navigateConfig(taskDataManager, selectedTaskId, task.configState, 'prev');
            this.resetAll();
            return true;
          }
        }
        this.resetAll();
        return true;

      case 'K':
        event.preventDefault();
        if (selectedTaskId) {
          const task = (currentState as any).tasks?.find((t: any) => t.id === selectedTaskId);
          if (task?.configState) {
            this.navigateConfig(taskDataManager, selectedTaskId, task.configState, 'next');
            this.resetAll();
            return true;
          }
        }
        this.resetAll();
        return true;

      case 'i':
        if (selectedTaskId) {
          event.preventDefault();
          taskDataManager.transition('i');
          taskDataManager.startContentNavigation();
          this.focusContentArea(selectedTaskId);
        }
        this.resetAll();
        return true;

      case 'Enter':
        if (selectedTaskId) {
          event.preventDefault();
          taskDataManager.transition('Enter');
          taskDataManager.startTitleEditing();
        }
        this.resetAll();
        return true;

      case ':':
        event.preventDefault();
        taskDataManager.transition(':');
        this.focusCommandInput();
        this.resetAll();
        return true;

      case '/':
        event.preventDefault();
        taskDataManager.transition('/');
        this.focusSearchInput();
        this.resetAll();
        return true;

      case '?':
        // 无选中任务（空列表）→ 全部键位；常规态 → 主线键位
        event.preventDefault();
        taskDataManager.toggleHelp((currentState as any).selectedTaskId ? 'normal' : 'all');
        this.resetAll();
        return true;

      case ' ':
        if (selectedTaskId) {
          event.preventDefault();
          taskDataManager.toggleTaskCompletion();
        }
        this.resetAll();
        return true;

      case 'f':
        if (selectedTaskId) {
          event.preventDefault();
          taskDataManager.toggleFlag();
        }
        this.resetAll();
        return true;

      case 'G':
        event.preventDefault();
        this.gotoTask(taskDataManager, currentState, this.countPrefix ? parseInt(this.countPrefix, 10) : undefined, 'last');
        this.scrollToSelectedTask();
        this.resetAll();
        return true;

      case 'T':
        event.preventDefault();
        toggleTheme();
        taskDataManager.setFlashMessage(t('flash.themeSet', { theme: prefs.theme }));
        this.resetAll();
        return true;

      case 'o':
        event.preventDefault();
        this.repeatAction(() => {
          const task = taskDataManager.createNewTask('', true);
          taskDataManager.transition('Enter');
          taskDataManager.startTitleEditing();
          return task;
        }, count);
        this.resetAll();
        return true;

      case 'O':
        event.preventDefault();
        this.repeatAction(() => {
          const task = taskDataManager.createNewTask('', false);
          taskDataManager.transition('Enter');
          taskDataManager.startTitleEditing();
          return task;
        }, count);
        this.resetAll();
        return true;

      case 'g':
        this.keySequence += key;
        if (this.keySequence === 'gg') {
          event.preventDefault();
          this.gotoTask(taskDataManager, currentState, this.countPrefix ? parseInt(this.countPrefix, 10) : undefined, 'first');
          this.scrollToSelectedTask();
          this.resetAll();
          return true;
        }
        this.setKeySequenceTimeout();
        event.preventDefault();
        return true;

      case 'z':
        // zz 居中（zt/zb 的第二键走 default 分支拼接）
        this.keySequence += key;
        if (this.keySequence === 'zz') {
          event.preventDefault();
          this.scrollToSelectedTask('center');
          this.resetAll();
          return true;
        }
        this.setKeySequenceTimeout();
        event.preventDefault();
        return true;

      case '*':
      case '#':
        // vim 语义：以选中任务标题为词，跳到下一个/上一个匹配
        event.preventDefault();
        taskDataManager.searchWordUnderCursor(key === '*' ? 1 : -1);
        this.scrollToSelectedTask();
        this.resetAll();
        return true;

      case 'd':
        this.keySequence += key;
        if (this.keySequence === 'dd') {
          event.preventDefault();
          this.repeatAction(() => taskDataManager.deleteSelectedTask(), count);
          this.resetAll();
          return true;
        }
        this.setKeySequenceTimeout();
        event.preventDefault();
        return true;

      case 'y':
        this.keySequence += key;
        if (this.keySequence === 'yy') {
          event.preventDefault();
          taskDataManager.copySelectedTask();
          taskDataManager.setFlashMessage(t('flash.copied', { title: taskDataManager.selectedTask?.title || '' }));
          this.resetAll();
          return true;
        }
        this.setKeySequenceTimeout();
        event.preventDefault();
        return true;

      case 'c':
        this.keySequence += key;
        if (this.keySequence === 'gc') {
          event.preventDefault();
          taskDataManager.openCalendarView();
          this.resetAll();
          return true;
        }
        if (this.keySequence === 'cc') {
          event.preventDefault();
          this.resetAll();
          if (selectedTaskId) {
            const task = (currentState as any).tasks?.find((t: any) => t.id === selectedTaskId);
            const isOpen = !!task?.configState;
            taskDataManager.setConfigState(selectedTaskId, isOpen ? undefined : 'schedule-select');
          }
          return true;
        }
        this.setKeySequenceTimeout();
        event.preventDefault();
        return true;

      case 'p':
        event.preventDefault();
        this.repeatAction(() => taskDataManager.pasteTask(), count);
        taskDataManager.setFlashMessage(t('flash.pasted', { title: taskDataManager.selectedTask?.title || '' }));
        this.resetAll();
        return true;

      case 'u':
        event.preventDefault();
        this.repeatAction(() => taskDataManager.undo(), count);
        this.resetAll();
        return true;

      case 'n':
        event.preventDefault();
        taskDataManager.searchNext(1);
        this.scrollToSelectedTask();
        this.resetAll();
        return true;

      case 'N':
        event.preventDefault();
        taskDataManager.searchNext(-1);
        this.scrollToSelectedTask();
        this.resetAll();
        return true;

      default:
        // zt 置顶 / zb 置底：z 前缀 + 第二键（t/b 无独立绑定，走 default 拼接）
        if (this.keySequence === 'z' && (key === 't' || key === 'b')) {
          event.preventDefault();
          this.scrollToSelectedTask(key === 't' ? 'top' : 'bottom');
          this.resetAll();
          return true;
        }
        if (this.keySequence.length > 0) {
          this.resetSequenceState();
          return true;
        }
        return false;
    }
  }

  private repeatAction(action: () => unknown, count: number): void {
    for (let i = 0; i < count; i++) {
      action();
    }
  }

  /** {n}G / {n}gg：跳到第 n 个任务；无 count 时 G→末、gg→首（vim 语义） */
  private gotoTask(tdm: Store, currentState: any, n: number | undefined, fallback: 'first' | 'last'): void {
    const items = (currentState as any).tasks as any[] | undefined;
    if (n !== undefined && items && items.length > 0) {
      const idx = Math.max(0, Math.min(n - 1, items.length - 1));
      tdm.selectTask(items[idx].id);
      return;
    }
    if (fallback === 'last') tdm.goToLast();
    else tdm.goToFirst();
  }

  private navigateConfig(tdm: Store, taskId: number, current: string, dir: 'next' | 'prev'): void {
    const cycle = ['schedule-select', 'priority-select', 'tags-select'];
    // edit 态由输入框独占，不参与 J/K 切换
    const idx = cycle.indexOf(current);
    if (idx < 0) return;
    const nextIdx = dir === 'next'
      ? (idx + 1) % cycle.length
      : (idx - 1 + cycle.length) % cycle.length;
    tdm.setConfigState(taskId, cycle[nextIdx]);
  }

  private resetAll(): void {
    this.countPrefix = '';
    this.resetSequenceState();
  }

  private resetSequenceState(): void {
    this.keySequence = '';
    if (this.keySequenceTimeout) {
      clearTimeout(this.keySequenceTimeout);
      this.keySequenceTimeout = null;
    }
  }

  private setKeySequenceTimeout(): void {
    if (this.keySequenceTimeout) clearTimeout(this.keySequenceTimeout);
    this.keySequenceTimeout = setTimeout(() => this.resetSequenceState(), 1000);
  }

  /** 日期视图按键：网格内 jkhl 上下左右移日焦点、数字跳日期（600ms 累加）、Enter 打开当日详情；
   *  详情内 j/k 选任务、Enter 打开任务、Esc 返回网格；H/L 切粒度、[ ] 翻页；Esc 网格退出视图；? 打开日历键位帮助 */
  private calNumBuffer = '';
  private calNumTimeout: ReturnType<typeof setTimeout> | null = null;
  private calNumPendingAt = 0;

  private resetCalNumBuffer(): void {
    this.calNumBuffer = '';
    this.calNumPendingAt = 0;
    if (this.calNumTimeout) {
      clearTimeout(this.calNumTimeout);
      this.calNumTimeout = null;
    }
  }

  private handleCalendarKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: Store
  ): boolean {
    const cv = (taskDataManager.getState() as any).calendarView;
    const inDetail = !!cv?.dayDetail || cv?.granularity === 'day';

    // 数字缓冲：任何非数字键都中断多位数字序列（1→12 是 12 日，不是两次 1）
    if (key < '0' || key > '9') this.resetCalNumBuffer();

    switch (key) {
      case 'H':
        event.preventDefault();
        if (cv?.dayDetail) taskDataManager.closeCalendarDayDetail();
        taskDataManager.cycleCalendarGranularity(-1);
        return true;
      case 'L':
        event.preventDefault();
        if (cv?.dayDetail) taskDataManager.closeCalendarDayDetail();
        taskDataManager.cycleCalendarGranularity(1);
        return true;
      case '[':
        event.preventDefault();
        if (cv?.dayDetail) taskDataManager.closeCalendarDayDetail();
        taskDataManager.shiftCalendarPage(-1);
        return true;
      case ']':
        event.preventDefault();
        if (cv?.dayDetail) taskDataManager.closeCalendarDayDetail();
        taskDataManager.shiftCalendarPage(1);
        return true;
      case 'j':
        event.preventDefault();
        if (inDetail) taskDataManager.moveCalendarDaySelection(1);
        else taskDataManager.moveCalendarDirection('down');
        return true;
      case 'k':
        event.preventDefault();
        if (inDetail) taskDataManager.moveCalendarDaySelection(-1);
        else taskDataManager.moveCalendarDirection('up');
        return true;
      case 'h':
        event.preventDefault();
        if (!inDetail) taskDataManager.moveCalendarDirection('left');
        return true;
      case 'l':
        event.preventDefault();
        if (!inDetail) taskDataManager.moveCalendarDirection('right');
        return true;
      case 'Escape':
        event.preventDefault();
        this.resetCalNumBuffer();
        // 详情子视图 → 返回网格；否则退出日历（day 粒度没有网格，Esc 直接退出）
        if (cv?.dayDetail) taskDataManager.closeCalendarDayDetail();
        else taskDataManager.closeCalendarView();
        this.blurInputFields();
        return true;
      case '?':
        event.preventDefault();
        taskDataManager.toggleHelp('calendar');
        return true;
      case 'Enter':
        event.preventDefault();
        this.resetCalNumBuffer();
        if (inDetail) {
          taskDataManager.selectCalendarTask();
          this.scrollToSelectedTask();
        } else {
          taskDataManager.openCalendarDayDetail();
        }
        return true;
      default:
        // 网格内数字跳日期：600ms 窗口内累加成多位序号（1→12 → 12 日），
        // 编号无效由 store 取消日焦点（显示与操作一致）
        if (!inDetail && key >= '0' && key <= '9') {
          event.preventDefault();
          const now = Date.now();
          if (now - this.calNumPendingAt > 600) this.calNumBuffer = '';
          this.calNumBuffer += key;
          this.calNumPendingAt = now;
          if (this.calNumTimeout) clearTimeout(this.calNumTimeout);
          this.calNumTimeout = setTimeout(() => this.resetCalNumBuffer(), 600);
          taskDataManager.jumpCalendarDay(parseInt(this.calNumBuffer, 10));
          return true;
        }
        return true; // 视图内其余键一律消费，不落到命令层
    }
  }

  dispose(): void {
    this.resetSequenceState();
    this.resetCalNumBuffer();
    this.countPrefix = '';
    this.scrollCallback = null;
    this.pageScrollCallback = null;
  }

  private scrollToSelectedTask(mode?: string): void {
    if (this.scrollCallback) {
      setTimeout(() => this.scrollCallback?.(mode), 10);
    }
  }

  private focusContentArea(selectedTaskId: number): void {
    setTimeout(() => {
      const el = document.querySelector(`[data-task-id="${selectedTaskId}"] .content-editor`);
      if (el instanceof HTMLTextAreaElement) el.focus();
    }, 50);
  }

  private focusCommandInput(): void {
    setTimeout(() => {
      const el = document.querySelector('.command-input');
      if (el instanceof HTMLInputElement) el.focus();
    }, 50);
  }

  private focusSearchInput(): void {
    setTimeout(() => {
      const el = document.querySelector('.command-input');
      if (el instanceof HTMLInputElement) el.focus();
    }, 50);
  }

  private blurInputFields(): void {
    const el = document.activeElement;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.blur();
    }
  }
}
