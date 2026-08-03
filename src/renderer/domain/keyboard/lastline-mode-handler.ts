/**
 * 最后一行模式处理器
 */

import { ModeHandler } from './base-handler';
import { Store } from '../state/store';
import { TaskPriority } from '../task';
import { logger } from '../../utils/logger';
import { setTheme, setLang, prefs } from '../state/prefs';
import { t } from '../../i18n';
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

    if (content.startsWith(':')) {
      const command = content.substring(1);
      this.executeVimCommand(command, taskDataManager);
    } else if (content.startsWith('/')) {
      const searchTerm = content.substring(1);
      this.executeSearch(searchTerm, taskDataManager);
    }
  }

  private executeVimCommand(
    command: string,
    taskDataManager: Store
  ): void {
    const cmd = command.trim().toLowerCase();
    const [baseCmd, ...args] = cmd.split(' ');

    switch (baseCmd) {
      case 'q':
      case 'quit':
        this.executeQuit();
        break;
      case 'w':
      case 'write':
        taskDataManager.saveTasks();
        break;
      case 'wq':
        taskDataManager.saveTasks();
        this.executeQuit();
        break;
      case 'help':
        taskDataManager.toggleHelp();
        break;
      case 'sort':
        taskDataManager.sortTasks(args[0] || 'title');
        break;
      case 'new':
        taskDataManager.createNewTask(args.join(' ') || '', true);
        break;
      case 'delete':
        taskDataManager.deleteSelectedTask();
        break;
      case 'schedule':
      case 'sched':
        this.setTaskSchedule(args, taskDataManager);
        break;
      case 'time':
        this.showTaskSchedule(taskDataManager);
        break;
      case 'p':
        this.setTaskPriority(args, taskDataManager);
        break;
      case 't':
      case 'tag':
        this.setTaskTags(args, taskDataManager);
        break;
      case 'theme':
        this.setTheme(args);
        break;
      case 'clear':
        taskDataManager.clearSearch();
        break;
      case 'lang':
      case 'language':
        this.setLanguage(args);
        break;
      default:
        logger.warn('LastLineModeHandler', `Unknown vim command: ${command}`);
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
      logger.info('LastLineModeHandler', 'Set schedule to today');
    } else if (args[0] === 'clear') {
      // 清除时间安排
      taskDataManager.updateTaskProperty(selectedTaskId, 'schedule', undefined);
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
        logger.info('LastLineModeHandler', `Set schedule to: ${timeStr}`);
      } else {
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

      logger.info('LastLineModeHandler', `任务 "${task.title}" 时间安排:`);
      logger.info('LastLineModeHandler', `时间: ${displayText}`);
      if (isExpired) {
        logger.info('LastLineModeHandler', '状态: 已过期');
      }
    } else {
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
      logger.info('LastLineModeHandler', `Cycled priority to: ${next}`);
    } else if (['clear', 'none', '0'].includes(args[0].toLowerCase())) {
      // 清除优先级（回到默认空状态）
      taskDataManager.updateTaskProperty(taskId, 'priority', undefined);
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
        logger.info('LastLineModeHandler', `Set priority to: ${p}`);
      } else {
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
      const tags = task.tags?.join(', ') || '(none)';
      logger.info('LastLineModeHandler', `Tags: ${tags}`);
    } else {
      const newTag = args.join(' ');
      const currentTags = task.tags || [];
      if (!currentTags.includes(newTag)) {
        taskDataManager.updateTaskProperty(taskId, 'tags', [
          ...currentTags,
          newTag,
        ]);
        logger.info('LastLineModeHandler', `Added tag: ${newTag}`);
      }
    }
  }

  /**
   * 切换主题：:theme dark | :theme light | :theme（无参数切换）
   */
  private setTheme(args: string[]): void {
    const arg = args[0]?.toLowerCase();
    if (arg === 'dark') setTheme('dark');
    else if (arg === 'light') setTheme('light');
    else setTheme(prefs.theme === 'dark' ? 'light' : 'dark');
  }

  /**
   * 切换语言：:lang zh | :lang en | :lang（无参数切换）
   */
  private setLanguage(args: string[]): void {
    const arg = args[0]?.toLowerCase();
    if (arg === 'zh' || arg === 'cn' || arg === '中文') setLang('zh');
    else if (arg === 'en' || arg === 'english') setLang('en');
    else setLang(prefs.lang === 'zh' ? 'en' : 'zh');
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
