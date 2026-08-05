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
 *   d 是删除前缀（仅 tags-select）—— d + 序号 + Enter 删除对应编号标签，输入时高亮目标，Esc/非数字键取消
 *   j/k 放行命令层做任务级上下移动（配置展开也不改变 j/k 语义）；H/L 放行命令层横向切换 section；其余未知键一律消费，防止落到命令层触发 paste/delete/undo 等全局副作用
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
  /** 标签删除待确认态：d 开启 → 数字累加 1 基序号 → Enter 删除 / Esc 取消 */
  private dPending = false;
  private dBuffer = '';
  private dTaskId = 0;

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

    // 残留的删除待确认态（离开 tags-select 或切换任务）清理，避免序号误累加
    if (this.dPending && (cs !== 'tags-select' || this.dTaskId !== task.id)) {
      this.cancelTagDelete(taskDataManager);
    }

    // d 待确认态（仅 tags-select 同一任务生效）：
    // 数字继续累加序号，Enter 确认删除，Esc 取消，其他键取消后按正常流程继续
    if (this.dPending && this.dTaskId === task.id) {
      if (key >= '0' && key <= '9') {
        event.preventDefault();
        this.dBuffer += key;
        this.syncTagDeleteIndex(taskDataManager, task);
        return true;
      }
      if (key === 'Enter') {
        event.preventDefault();
        this.confirmTagDelete(taskDataManager, task);
        return true;
      }
      if (key === 'Escape') {
        event.preventDefault();
        this.cancelTagDelete(taskDataManager);
        return true;
      }
      this.cancelTagDelete(taskDataManager);
    }

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
      case 'd':
        // 仅 tags-select 开启删除待确认；其余 section 的 d 一律消费（不落到命令层触发全局删除）
        if (cs === 'tags-select') {
          event.preventDefault();
          this.dPending = true;
          this.dTaskId = task.id;
          this.dBuffer = '';
          this.syncTagDeleteIndex(taskDataManager, task);
        }
        return true;

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
        this.cancelTagDelete(taskDataManager);
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
        // j/k 放行命令层做任务级移动；H/L 放行命令层横向切换 section；其余未知键一律消费，避免落到命令层产生全局副作用
        if (key === 'j' || key === 'k' || key === 'H' || key === 'L') return false;
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

  /** 根据已输数字串计算 1 基序号，写入响应式状态驱动面板高亮；越界/空则不亮 */
  private syncTagDeleteIndex(tdm: Store, task: any): void {
    const idx = parseInt(this.dBuffer, 10);
    const tags = task.tags || [];
    tdm.setTagDeleteIndex(idx >= 1 && idx <= tags.length ? idx : 0);
  }

  private confirmTagDelete(tdm: Store, task: any): void {
    const idx = parseInt(this.dBuffer, 10);
    this.cancelTagDelete(tdm);
    const tags = task.tags || [];
    if (!(idx >= 1 && idx <= tags.length)) return; // 无效序号：仅取消
    const newTags = tags.filter((_: string, i: number) => i !== idx - 1);
    tdm.updateTaskProperty(task.id, 'tags', newTags);
  }

  private cancelTagDelete(tdm: Store): void {
    this.dPending = false;
    this.dBuffer = '';
    this.dTaskId = 0;
    tdm.setTagDeleteIndex(0);
  }
}
