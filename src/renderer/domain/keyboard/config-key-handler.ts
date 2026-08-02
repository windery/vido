/**
 * 配置模式键盘处理器
 * 根据 task.configState 分发按键
 *
 * 状态机（单一拥有者）：
 *   select 态（schedule-select / priority-select / tags-select）→ 由本处理器独占
 *   edit 态（schedule-edit / tags-edit）→ 由配置输入框独占（其 keydown 已 .stop 拦截 Enter/Escape 并转回同类型 select 态）
 */

import { Store } from '../state/store';
import { TaskPriority } from '../task';
import { parseScheduleFromString } from '../../utils/schedule-helper';

/** edit 态由配置输入框独占，ConfigKeyHandler 与命令层均不处理 */
export function isConfigEditState(cs: string | undefined): boolean {
  return cs === 'schedule-edit' || cs === 'tags-edit';
}

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

    // edit 态由输入框独占，此处不拦截
    if (isConfigEditState(cs)) return false;

    switch (key) {
      case 'Escape':
        event.preventDefault();
        taskDataManager.setConfigState(task.id, undefined);
        return true;

      case 'Enter':
        if (cs === 'schedule-select') {
          event.preventDefault();
          taskDataManager.setConfigState(task.id, 'schedule-edit');
          return true;
        }
        if (cs === 'tags-select') {
          event.preventDefault();
          taskDataManager.setConfigState(task.id, 'tags-edit');
          return true;
        }
        return false;

      default:
        if (cs === 'schedule-select') return this.handleSchedule(event, key, taskDataManager, task.id);
        if (cs === 'priority-select') return this.handlePriority(event, key, taskDataManager, task.id);
        if (cs === 'tags-select') return this.handleTags(event, key, taskDataManager, task.id);
        return false;
    }
  }

  private handleSchedule(e: KeyboardEvent, key: string, tdm: Store, taskId: number): boolean {
    const map: Record<string, string> = { '1': 'today', '2': 'tomorrow', '3': 'next_week' };
    if (map[key]) {
      e.preventDefault();
      const s = parseScheduleFromString(map[key]);
      if (s) tdm.updateTaskProperty(taskId, 'schedule', s);
      tdm.setConfigState(taskId, 'schedule-select'); // 选后留在 schedule-select
      return true;
    }
    if (key === 'c') {
      e.preventDefault();
      tdm.updateTaskProperty(taskId, 'schedule', undefined);
      tdm.setConfigState(taskId, 'schedule-select');
      return true;
    }
    return false;
  }

  private handlePriority(e: KeyboardEvent, key: string, tdm: Store, taskId: number): boolean {
    const map: Record<string, TaskPriority> = { '1': TaskPriority.HIGH, '2': TaskPriority.MEDIUM, '3': TaskPriority.LOW };
    if (map[key]) {
      e.preventDefault();
      tdm.updateTaskProperty(taskId, 'priority', map[key]);
      tdm.setConfigState(taskId, 'priority-select'); // 选后留在 priority-select（CLAUDE.md 状态机：不改配置类型）
      return true;
    }
    return false;
  }

  private handleTags(e: KeyboardEvent, key: string, tdm: Store, taskId: number): boolean {
    if (key === 'c') {
      e.preventDefault();
      tdm.updateTaskProperty(taskId, 'tags', []);
      return true; // 留在 tags-select
    }
    return false;
  }
}
