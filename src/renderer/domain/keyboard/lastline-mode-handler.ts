/**
 * 最后一行模式处理器
 */

import { ModeHandler } from './base-handler';
import { Store } from '../state/store';
import { TaskPriority } from '../task';
import { logger } from '../../utils/logger';
import { setTheme, prefs } from '../state/prefs';
import { t } from '../../i18n';

/** 优先级符号：与 CLAUDE.md 符号约定一致（!!!高 !!中 !低） */
const PRIORITY_MARKS: Record<string, string> = {
  [TaskPriority.HIGH]: '!!!',
  [TaskPriority.MEDIUM]: '!!',
  [TaskPriority.LOW]: '!',
};
import {
  createTodaySchedule,
  parseScheduleFromString,
  getScheduleDisplayText,
  isScheduleExpired,
} from '../../utils/schedule-helper';

export class LastLineModeHandler implements ModeHandler {
  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: Store,
    _isInInputField: boolean
  ): boolean {
    // 检查是否处于输入法组合状态
    const isComposing = this.isIMEComposing(event);

    switch (key) {
      case 'Escape':
        event.preventDefault();
        taskDataManager.transition('Escape');
        return true;
      case 'Enter':
        // 如果处于输入法组合状态，让输入法处理
        if (isComposing) {
          return false; // 不处理，让输入法完成组合
        }
        event.preventDefault();
        this.executeLastLineCommand(taskDataManager);
        taskDataManager.transition('Enter');
        return true;
    }
    return false;
  }

  private executeLastLineCommand(taskDataManager: Store): void {
    const currentState = taskDataManager.getState();
    const content = currentState.lastlineContent;

    logger.info('LastLineModeHandler', `Executing command: "${content}"`);

    // vim 语义：只有有效命令 / 非空搜索才入历史，供 lastline ↑/↓ 复用
    if (content.startsWith(':')) {
      const command = content.substring(1);
      if (this.executeVimCommand(command, taskDataManager)) {
        taskDataManager.pushLastlineHistory(content);
      }
    } else if (content.startsWith('/')) {
      const searchTerm = content.substring(1);
      if (searchTerm.trim()) {
        taskDataManager.pushLastlineHistory(content);
      }
      this.executeSearch(searchTerm, taskDataManager);
    }
  }

  /** 返回命令是否有效（未知命令不进历史，避免污染 ↑/↓ 复用） */
  private executeVimCommand(
    command: string,
    taskDataManager: Store
  ): boolean {
    const cmd = command.trim().toLowerCase();
    const [baseCmd, ...args] = cmd.split(' ');

    switch (baseCmd) {
      case 'q':
      case 'quit':
        this.executeQuit();
        return true;
      case 'w':
      case 'write':
        taskDataManager.saveTasks();
        taskDataManager.setFlashMessage(t('flash.saved'));
        return true;
      case 'wq':
        taskDataManager.saveTasks();
        taskDataManager.setFlashMessage(t('flash.saved'));
        this.executeQuit();
        return true;
      case 'help':
        taskDataManager.toggleHelp();
        return true;
      case 'sort':
        taskDataManager.sortTasks(args[0] || 'title');
        taskDataManager.setFlashMessage(t('flash.sorted', { type: args[0] || 'title' }));
        return true;
      case 'new':
        taskDataManager.createNewTask(args.join(' ') || '', true);
        return true;
      case 'delete':
        taskDataManager.deleteSelectedTask();
        return true;
      case 'schedule':
        this.setTaskSchedule(args, taskDataManager);
        return true;
      case 'time':
        this.showTaskSchedule(taskDataManager);
        return true;
      case 'p':
        this.setTaskPriority(args, taskDataManager);
        return true;
      case 't':
      case 'tag':
        this.setTaskTags(args, taskDataManager);
        return true;
      case 'theme':
        this.setTheme(args, taskDataManager);
        return true;
      case 'clear':
        taskDataManager.clearSearch();
        taskDataManager.setFlashMessage(t('flash.searchCleared'));
        return true;
      case 'undo':
        taskDataManager.undo();
        return true;
      case 'redo':
        taskDataManager.redo();
        return true;
      default:
        logger.warn('LastLineModeHandler', `Unknown vim command: ${command}`);
        taskDataManager.setFlashMessage(t('flash.unknownCommand', { cmd: command.trim() }));
        return false;
    }
  }

  private executeSearch(
    searchTerm: string,
    taskDataManager: Store
  ): void {
    logger.info('LastLineModeHandler', `Executing search: ${searchTerm}`);
    // UI 过滤由 lastlineContent 驱动（composables/use-task-list），
    // 这里仅确保选中项落在匹配集合内（与 vido.html 一致）。
    taskDataManager.applySearch(searchTerm);
  }

  private executeQuit(): void {
    if (typeof window !== 'undefined' && (window as any).ipcRenderer) {
      (window as any).ipcRenderer.send('quit-app');
    } else {
      alert(t('msg.quitFallback'));
    }
  }

  /**
   * 设置任务时间安排
   */
  private setTaskSchedule(
    args: string[],
    taskDataManager: Store
  ): void {
    const selectedTaskId = taskDataManager.getState().selectedTaskId;
    if (!selectedTaskId) {
      logger.warn(
        'LastLineModeHandler',
        'No task selected for setting schedule'
      );
      return;
    }

    if (args.length === 0) {
      // 没有参数，设置为今天
      const schedule = createTodaySchedule();
      taskDataManager.updateTaskProperty(selectedTaskId, 'schedule', schedule);
      taskDataManager.setFlashMessage(t('flash.scheduleSet', { text: getScheduleDisplayText(schedule) }));
      logger.info('LastLineModeHandler', 'Set schedule to today');
    } else if (args[0] === 'clear') {
      // 清除时间安排
      taskDataManager.updateTaskProperty(selectedTaskId, 'schedule', undefined);
      taskDataManager.setFlashMessage(t('flash.scheduleCleared'));
      logger.info('LastLineModeHandler', 'Cleared schedule');
    } else {
      // 解析时间参数
      const timeStr = args.join(' ');
      const schedule = parseScheduleFromString(timeStr);

      if (schedule) {
        taskDataManager.updateTaskProperty(
          selectedTaskId,
          'schedule',
          schedule
        );
        taskDataManager.setFlashMessage(t('flash.scheduleSet', { text: getScheduleDisplayText(schedule) }));
        logger.info('LastLineModeHandler', `Set schedule to: ${timeStr}`);
      } else {
        taskDataManager.setFlashMessage(`${timeStr} ✗`);
        logger.warn(
          'LastLineModeHandler',
          `Invalid schedule format: ${timeStr}`
        );
      }
    }
  }

  /**
   * 显示任务时间安排信息
   */
  private showTaskSchedule(taskDataManager: Store): void {
    const selectedTaskId = taskDataManager.getState().selectedTaskId;
    if (!selectedTaskId) {
      logger.warn(
        'LastLineModeHandler',
        'No task selected for showing schedule'
      );
      return;
    }

    const tasks = taskDataManager.getTaskDataState().tasks;
    const task = tasks.find((t: any) => t.id === selectedTaskId);
    if (!task) {
      logger.warn('LastLineModeHandler', `Task ${selectedTaskId} not found`);
      return;
    }

    if (task.schedule) {
      const displayText = getScheduleDisplayText(task.schedule);
      const isExpired = isScheduleExpired(task.schedule);
      const expiredSuffix = isExpired ? ` ${t('flash.scheduleExpired')}` : '';
      taskDataManager.setFlashMessage(t('flash.scheduleSet', { text: displayText }) + expiredSuffix);

      logger.info('LastLineModeHandler', `任务 "${task.title}" 时间安排:`);
      logger.info('LastLineModeHandler', `时间: ${displayText}`);
      if (isExpired) {
        logger.info('LastLineModeHandler', '状态: 已过期');
      }
    } else {
      taskDataManager.setFlashMessage(t('flash.noSchedule'));
      logger.info(
        'LastLineModeHandler',
        `任务 "${task.title}" 没有设置时间安排`
      );
    }
  }

  private setTaskPriority(
    args: string[],
    taskDataManager: Store
  ): void {
    const taskId = taskDataManager.getState().selectedTaskId;
    if (!taskId) {
      logger.warn('LastLineModeHandler', 'No task selected for priority');
      return;
    }

    if (args.length === 0) {
      // 无参数：循环切换 P2 → P1 → P3 → P2
      const task = taskDataManager.getTaskDataState().tasks.find(
        (t: any) => t.id === taskId
      );
      const cycle = [TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.LOW];
      const current = task?.priority || TaskPriority.MEDIUM;
      const idx = cycle.indexOf(current);
      const next = cycle[(idx + 1) % cycle.length];
      taskDataManager.updateTaskProperty(taskId, 'priority', next);
      taskDataManager.setFlashMessage(t('flash.prioritySet', { mark: PRIORITY_MARKS[next] }));
      logger.info('LastLineModeHandler', `Cycled priority to: ${next}`);
    } else if (['clear', 'none', '0'].includes(args[0].toLowerCase())) {
      // 清除优先级（回到默认空状态）
      taskDataManager.updateTaskProperty(taskId, 'priority', undefined);
      taskDataManager.setFlashMessage(t('flash.priorityCleared'));
      logger.info('LastLineModeHandler', 'Cleared priority');
    } else {
      const map: Record<string, TaskPriority> = {
        '1': TaskPriority.HIGH,
        '2': TaskPriority.MEDIUM,
        '3': TaskPriority.LOW,
        'high': TaskPriority.HIGH,
        'medium': TaskPriority.MEDIUM,
        'low': TaskPriority.LOW,
      };
      const p =
        map[args[0].toLowerCase()] || (args[0].toUpperCase() as TaskPriority);
      if (Object.values(TaskPriority).includes(p)) {
        taskDataManager.updateTaskProperty(taskId, 'priority', p);
        taskDataManager.setFlashMessage(t('flash.prioritySet', { mark: PRIORITY_MARKS[p] }));
        logger.info('LastLineModeHandler', `Set priority to: ${p}`);
      } else {
        taskDataManager.setFlashMessage(`${args[0]} ✗`);
        logger.warn('LastLineModeHandler', `Invalid priority: ${args[0]}`);
      }
    }
  }

  private setTaskTags(
    args: string[],
    taskDataManager: Store
  ): void {
    const taskId = taskDataManager.getState().selectedTaskId;
    if (!taskId) {
      logger.warn('LastLineModeHandler', 'No task selected for tags');
      return;
    }

    const task = taskDataManager.getTaskDataState().tasks.find(
      (t: any) => t.id === taskId
    );
    if (!task) return;

    if (args.length === 0) {
      const tags = task.tags?.join(', ') || '-';
      taskDataManager.setFlashMessage(t('flash.tagsShown', { tags }));
      logger.info('LastLineModeHandler', `Tags: ${tags}`);
    } else {
      const newTag = args.join(' ');
      const currentTags = task.tags || [];
      if (!currentTags.includes(newTag)) {
        taskDataManager.updateTaskProperty(taskId, 'tags', [
          ...currentTags,
          newTag,
        ]);
        taskDataManager.setFlashMessage(t('flash.tagAdded', { tag: newTag }));
        logger.info('LastLineModeHandler', `Added tag: ${newTag}`);
      }
    }
  }

  /**
   * 切换主题：:theme dark | :theme light | :theme（无参数切换）
   */
  private setTheme(args: string[], taskDataManager: Store): void {
    const arg = args[0]?.toLowerCase();
    let theme: 'dark' | 'light';
    if (arg === 'dark') theme = 'dark';
    else if (arg === 'light') theme = 'light';
    else theme = prefs.theme === 'dark' ? 'light' : 'dark';
    setTheme(theme);
    taskDataManager.setFlashMessage(t('flash.themeSet', { theme }));
  }

  /**
   * 检查是否处于输入法组合状态
   * 通过KeyboardEvent的isComposing属性来判断
   */
  private isIMEComposing(event: KeyboardEvent): boolean {
    // isComposing属性表示当前是否处于输入法组合状态
    // 在中文输入法输入拼音时，isComposing为true
    // 当用户按回车确认拼音输入时，isComposing仍为true，直到组合完成
    return event.isComposing || false;
  }

  dispose(): void {}
}
