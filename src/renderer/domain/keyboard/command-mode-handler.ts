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
  private scrollCallback: (() => void) | null = null;

  /** 注入滚动回调，替代 window 全局访问 */
  setScrollCallback(cb: () => void): void {
    this.scrollCallback = cb;
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

      // 配置展开时：H/L 在同一任务的配置项间横向切换（j/k 留给任务级上下移动）
      case 'H':
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

      case 'L':
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
        event.preventDefault();
        taskDataManager.toggleHelp();
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
        taskDataManager.goToLast();
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
          taskDataManager.goToFirst();
          this.scrollToSelectedTask();
          this.resetAll();
          return true;
        }
        this.setKeySequenceTimeout();
        event.preventDefault();
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

  private navigateConfig(tdm: Store, taskId: number, current: string, dir: 'next' | 'prev'): void {
    const cycle = ['schedule-select', 'priority-select', 'tags-select'];
    // edit 态由输入框独占，不参与 H/L 切换
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

  /** 日期视图按键：H/L 切粒度、[ ] 翻页、j/k 选任务、Enter 打开任务、Esc 退出 */
  private handleCalendarKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: Store
  ): boolean {
    switch (key) {
      case 'H':
        event.preventDefault();
        taskDataManager.cycleCalendarGranularity(-1);
        return true;
      case 'L':
        event.preventDefault();
        taskDataManager.cycleCalendarGranularity(1);
        return true;
      case '[':
        event.preventDefault();
        taskDataManager.shiftCalendarPage(-1);
        return true;
      case ']':
        event.preventDefault();
        taskDataManager.shiftCalendarPage(1);
        return true;
      case 'Escape':
        event.preventDefault();
        taskDataManager.closeCalendarView();
        this.blurInputFields();
        return true;
      case 'Enter':
        event.preventDefault();
        taskDataManager.closeCalendarView();
        return true;
      default:
        return true; // 视图内其余键一律消费，不落到命令层
    }
  }

  dispose(): void {
    this.resetSequenceState();
    this.countPrefix = '';
    this.scrollCallback = null;
  }

  private scrollToSelectedTask(): void {
    if (this.scrollCallback) {
      setTimeout(() => this.scrollCallback?.(), 10);
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
