/**
 * 配置模式键盘处理器
 * 根据 task.configState 分发按键
 */

import { Store } from '../state/store';
import { TaskPriority } from '../task';
import { parseScheduleFromString } from '../../utils/schedule-helper';

export class ConfigKeyHandler {
  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: Store
  ): boolean {
    const state = taskDataManager.getTaskDataState();
    const task = state.tasks.find((t: any) => t.configState);
    if (!task) return false;

    const cs = task.configState;

    // 输入状态不拦截，由 input 处理
    if (cs === 'scheduleInput' || cs === 'tagsInput') return false;

    switch (key) {
      case 'Escape':
        event.preventDefault();
        taskDataManager.setConfigState(task.id, undefined);
        return true;

      case 'Enter':
        if (cs === 'schedule') {
          event.preventDefault();
          taskDataManager.setConfigState(task.id, 'scheduleInput');
          return true;
        }
        if (cs === 'tags') {
          event.preventDefault();
          taskDataManager.setConfigState(task.id, 'tagsInput');
          return true;
        }
        return false;

      default:
        if (cs === 'schedule') return this.handleSchedule(event, key, taskDataManager, task.id);
        if (cs === 'priority') return this.handlePriority(event, key, taskDataManager, task.id);
        if (cs === 'tags') return this.handleTags(event, key, taskDataManager, task.id);
        return false;
    }
  }

  private handleSchedule(e: KeyboardEvent, key: string, tdm: Store, taskId: number): boolean {
    const map: Record<string, string> = { '1': 'today', '2': 'tomorrow', '3': 'next_week' };
    if (map[key]) {
      e.preventDefault();
      const s = parseScheduleFromString(map[key]);
      if (s) tdm.updateTaskProperty(taskId, 'schedule', s);
      tdm.setConfigState(taskId, 'schedule');
      return true;
    }
    if (key === 'c') {
      e.preventDefault();
      tdm.updateTaskProperty(taskId, 'schedule', undefined);
      tdm.setConfigState(taskId, 'schedule');
      return true;
    }
    return false;
  }

  private handlePriority(e: KeyboardEvent, key: string, tdm: Store, taskId: number): boolean {
    const map: Record<string, TaskPriority> = { '1': TaskPriority.HIGH, '2': TaskPriority.MEDIUM, '3': TaskPriority.LOW };
    if (map[key]) {
      e.preventDefault();
      tdm.updateTaskProperty(taskId, 'priority', map[key]);
      tdm.setConfigState(taskId, 'schedule'); // 回到默认
      return true;
    }
    return false;
  }

  private handleTags(e: KeyboardEvent, key: string, tdm: Store, taskId: number): boolean {
    if (key === 'c') {
      e.preventDefault();
      tdm.updateTaskProperty(taskId, 'tags', []);
      return true;
    }
    return false;
  }
}
