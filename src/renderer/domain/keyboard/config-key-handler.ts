/**
 * 配置模式键盘处理器
 * 配置面板展开时，根据 focusedConfigItem 分发按键
 *   0=schedule  1=priority  2=tags  -1=无焦点
 */

import { TaskDataManager } from '../core/task-data-manager';
import { TaskPriority } from '../task';
import { parseScheduleFromString } from '../../utils/schedule-helper';
import { logger } from '../../utils/logger';

export class ConfigKeyHandler {
  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: TaskDataManager
  ): boolean {
    const state = taskDataManager.getTaskDataState();
    const task = state.tasks.find((t: any) => t.isConfigExpanded);
    if (!task) return false;

    const focus = task.focusedConfigItem ?? -1;

    switch (key) {
      case 'Escape':
        event.preventDefault();
        taskDataManager.closeConfigPanel();
        return true;

      case 'h':
        event.preventDefault();
        this.focusItem(taskDataManager, task.id, Math.max(0, focus - 1));
        return true;

      case 'l':
        event.preventDefault();
        this.focusItem(taskDataManager, task.id, Math.min(2, focus + 1));
        return true;
    }

    // 根据焦点分发
    switch (focus) {
      case 0: return this.handleScheduleKey(event, key, taskDataManager, task.id);
      case 1: return this.handlePriorityKey(event, key, taskDataManager, task.id);
      case 2: return this.handleTagsKey(event, key, taskDataManager, task.id);
      default: return false; // 无焦点时不消费其他键
    }
  }

  private focusItem(tdm: TaskDataManager, taskId: number, focus: number): void {
    tdm.focusConfigItem(taskId, focus);
  }

  private clearFocus(tdm: TaskDataManager, taskId: number): void {
    tdm.focusConfigItem(taskId, -1);
  }

  private handleScheduleKey(
    event: KeyboardEvent,
    key: string,
    tdm: TaskDataManager,
    taskId: number
  ): boolean {
    const quickMap: Record<string, string> = {
      '1': 'today', '2': 'tomorrow', '3': 'next_week',
      '4': '', // custom — handled by Enter
      '5': 'clear',
    };

    if (quickMap[key]) {
      event.preventDefault();
      if (key === '5') {
        tdm.updateTaskProperty(taskId, 'schedule', undefined);
      } else if (key !== '4') {
        const s = parseScheduleFromString(quickMap[key]);
        if (s) tdm.updateTaskProperty(taskId, 'schedule', s);
      }
      this.clearFocus(tdm, taskId);
      return true;
    }

    if (key === 'Enter' || key === '/') {
      event.preventDefault();
      tdm.activateScheduleInput(taskId);
      return true;
    }

    return false;
  }

  private handlePriorityKey(
    event: KeyboardEvent,
    key: string,
    tdm: TaskDataManager,
    taskId: number
  ): boolean {
    const priorityMap: Record<string, TaskPriority> = {
      '1': TaskPriority.HIGH,
      '2': TaskPriority.MEDIUM,
      '3': TaskPriority.LOW,
    };

    if (priorityMap[key]) {
      event.preventDefault();
      tdm.updateTaskProperty(taskId, 'priority', priorityMap[key]);
      this.clearFocus(tdm, taskId);
      return true;
    }

    if (key === 'j' || key === 'k') {
      // j/k 循环切换优先级
      event.preventDefault();
      const state = tdm.getTaskDataState();
      const task = state.tasks.find((t: any) => t.id === taskId);
      const cycle = [TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.LOW];
      const current = task?.priority || TaskPriority.MEDIUM;
      const idx = cycle.indexOf(current);
      const next = cycle[(idx + (key === 'j' ? 1 : -1) + cycle.length) % cycle.length];
      tdm.updateTaskProperty(taskId, 'priority', next);
      this.clearFocus(tdm, taskId);
      return true;
    }

    return false;
  }

  private handleTagsKey(
    event: KeyboardEvent,
    key: string,
    tdm: TaskDataManager,
    taskId: number
  ): boolean {
    // Enter 激活标签输入框
    if (key === 'Enter') {
      event.preventDefault();
      tdm.activateTagInput(taskId);
      return true;
    }
    return false;
  }
}
