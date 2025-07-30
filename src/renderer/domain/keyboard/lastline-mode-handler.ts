/**
 * 最后一行模式处理器
 */

import { ModeHandler } from './base-handler';
import { TaskDataManager } from '../core/task-data-manager';
import { logger } from '../../utils/logger';
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
    taskDataManager: TaskDataManager,
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

  private executeLastLineCommand(taskDataManager: TaskDataManager): void {
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
    taskDataManager: TaskDataManager
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
      default:
        logger.warn('LastLineModeHandler', `Unknown vim command: ${command}`);
    }
  }

  private executeSearch(
    searchTerm: string,
    _taskDataManager: TaskDataManager
  ): void {
    logger.info('LastLineModeHandler', `Executing search: ${searchTerm}`);
    // 搜索逻辑已在TaskDataManager中实现
    // 注意：搜索状态需要在状态转换时保持
  }

  private executeQuit(): void {
    if (typeof window !== 'undefined' && (window as any).ipcRenderer) {
      (window as any).ipcRenderer.send('quit-app');
    } else {
      alert('Quit function available in Electron environment');
    }
  }

  /**
   * 设置任务时间安排
   */
  private setTaskSchedule(
    args: string[],
    taskDataManager: TaskDataManager
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
  private showTaskSchedule(taskDataManager: TaskDataManager): void {
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

  /**
   * 解析日期时间字符串
   */
  private parseDateTime(dateStr: string): Date | null {
    // 支持多种格式（用于文档说明）
    const _formats = [
      // ISO格式
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
      // 简化格式
      /^\d{2}-\d{2}$/, // MM-DD
      /^\d{2}-\d{2} \d{2}:\d{2}$/, // MM-DD HH:MM
    ];

    try {
      // 尝试直接解析
      let parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }

      // 处理简化格式
      if (/^\d{2}-\d{2}$/.test(dateStr)) {
        // MM-DD格式，使用当前年份
        const currentYear = new Date().getFullYear();
        parsedDate = new Date(`${currentYear}-${dateStr}`);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }

      if (/^\d{2}-\d{2} \d{2}:\d{2}$/.test(dateStr)) {
        // MM-DD HH:MM格式，使用当前年份
        const currentYear = new Date().getFullYear();
        const [datePart, timePart] = dateStr.split(' ');
        parsedDate = new Date(`${currentYear}-${datePart}T${timePart}`);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
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
}
