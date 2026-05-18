/**
 * 配置模式键盘处理器
 * 根据 task.configState 分发按键
 */

import { TaskDataManager } from '../core/task-data-manager';
import { TaskPriority } from '../task';
import { parseScheduleFromString } from '../../utils/schedule-helper';

export class ConfigKeyHandler {
  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: TaskDataManager
  ): boolean {
    const state = taskDataManager.getTaskDataState();
    const task = state.tasks.find((t: any) => t.configState);
    if (!task) return false;

    const cs = task.configState;

    // 输入状态不拦截，由 input 处理
    if (cs === 'scheduleInput' || cs === 'tags') return false;

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
        return false;

      default:
        if (cs === 'schedule') return this.handleSchedule(event, key, taskDataManager, task.id);
        if (cs === 'priority') return this.handlePriority(event, key, taskDataManager, task.id);
        return false;
    }
  }

  private handleSchedule(e: KeyboardEvent, key: string, tdm: TaskDataManager, taskId: number): boolean {
    const map: Record<string, string> = { '1': 'today', '2': 'tomorrow', '3': 'next_week', '5': 'clear' };
    if (map[key]) {
      e.preventDefault();
      if (key === '5') {
        tdm.updateTaskProperty(taskId, 'schedule', undefined);
      } else {
        const s = parseScheduleFromString(map[key]);
        if (s) tdm.updateTaskProperty(taskId, 'schedule', s);
      }
      tdm.setConfigState(taskId, 'schedule'); // 回 schedule 状态
      return true;
    }
    return false;
  }

  private handlePriority(e: KeyboardEvent, key: string, tdm: TaskDataManager, taskId: number): boolean {
    const map: Record<string, TaskPriority> = { '1': TaskPriority.HIGH, '2': TaskPriority.MEDIUM, '3': TaskPriority.LOW };
    if (map[key]) {
      e.preventDefault();
      tdm.updateTaskProperty(taskId, 'priority', map[key]);
      tdm.setConfigState(taskId, 'schedule'); // 回到默认
      return true;
    }
    return false;
  }
}
