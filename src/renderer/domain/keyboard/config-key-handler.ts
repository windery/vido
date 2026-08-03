/**
 * 配置模式键盘处理器
 * 根据 task.configState 分发按键
 *
 * 状态机（单一拥有者）：
 *   select 态（schedule-select / priority-select / tags-select）→ 由本处理器独占
 *   edit 态（schedule-edit / tags-edit）→ 由配置输入框独占（其 keydown 已 .stop 拦截 Enter/Escape 并转回同类型 select 态）
 *
 * 面板内键位（vim operator 前缀模型）：
 *   c 是前缀操作符 —— cc 清除当前项，cs/cp/ct 直达 日程/优先级/标签，600ms 超时或无匹配则取消
 *   j/k 放行命令层切换 section；其余未知键一律消费，防止落到命令层触发 paste/delete/undo 等全局副作用
 */

import { Store } from '../state/store';
import { TaskPriority } from '../task';
import { parseScheduleFromString } from '../../utils/schedule-helper';

/** edit 态由配置输入框独占，ConfigKeyHandler 与命令层均不处理 */
export function isConfigEditState(cs: string | undefined): boolean {
  return cs === 'schedule-edit' || cs === 'tags-edit';
}

const JUMP_MAP: Record<string, string> = { s: 'schedule-select', p: 'priority-select', t: 'tags-select' };

export class ConfigKeyHandler {
  private cPending = false;
  private cTimeout: ReturnType<typeof setTimeout> | null = null;

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

    // c 前缀序列：cs/cp/ct 跳转、cc 清除；非目标键则取消前缀后按正常流程处理
    if (this.cPending) {
      this.cancelCPending();
      if (key === 'c') {
        event.preventDefault();
        this.clearCurrent(taskDataManager, task.id, cs);
        return true;
      }
      if (JUMP_MAP[key]) {
        event.preventDefault();
        taskDataManager.setConfigState(task.id, JUMP_MAP[key]);
        return true;
      }
    }

    switch (key) {
      case 'c':
        event.preventDefault();
        this.cPending = true;
        this.cTimeout = setTimeout(() => {
          this.cPending = false;
          this.cTimeout = null;
        }, 600);
        return true;

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
        return true; // priority 只有 select 态，Enter 无操作

      default:
        // j/k 交给命令层在 section 间切换；其余未知键一律消费，避免落到命令层产生全局副作用
        if (key === 'j' || key === 'k') return false;
        if (cs === 'schedule-select') this.handleSchedule(event, key, taskDataManager, task.id);
        else if (cs === 'priority-select') this.handlePriority(event, key, taskDataManager, task.id);
        // tags-select：无快捷选择，直接消费
        return true;
    }
  }

  private clearCurrent(tdm: Store, taskId: number, cs: string): void {
    if (cs === 'schedule-select') tdm.updateTaskProperty(taskId, 'schedule', undefined);
    else if (cs === 'priority-select') tdm.updateTaskProperty(taskId, 'priority', undefined);
    else if (cs === 'tags-select') tdm.updateTaskProperty(taskId, 'tags', []);
  }

  private cancelCPending(): void {
    this.cPending = false;
    if (this.cTimeout) {
      clearTimeout(this.cTimeout);
      this.cTimeout = null;
    }
  }

  private handleSchedule(e: KeyboardEvent, key: string, tdm: Store, taskId: number): void {
    const map: Record<string, string> = { '1': 'today', '2': 'tomorrow', '3': 'next_week' };
    if (map[key]) {
      e.preventDefault();
      const s = parseScheduleFromString(map[key]);
      if (s) tdm.updateTaskProperty(taskId, 'schedule', s);
      tdm.setConfigState(taskId, 'schedule-select'); // 选后留在 schedule-select
    }
  }

  private handlePriority(e: KeyboardEvent, key: string, tdm: Store, taskId: number): void {
    const map: Record<string, TaskPriority> = { '1': TaskPriority.HIGH, '2': TaskPriority.MEDIUM, '3': TaskPriority.LOW };
    if (map[key]) {
      e.preventDefault();
      tdm.updateTaskProperty(taskId, 'priority', map[key]);
      tdm.setConfigState(taskId, 'priority-select'); // 选后留在 priority-select（CLAUDE.md 状态机：不改配置类型）
    }
  }
}
