/**
 * 配置模式键盘处理器
 * 根据 task.configState 分发按键
 *
 * 状态机（单一拥有者）：
 *   select 态（schedule-select / priority-select / tags-select）→ 由本处理器独占
 *   edit 态（schedule-edit / tags-edit）→ 由配置输入框独占（其 keydown 已 .stop 拦截 Enter/Escape 并转回同类型 select 态）
 *
 * 面板内键位（c = 配置导航，d = 删除仅限标签——命名空间严格分离，杜绝 cc 开/清歧义）：
 *   c 是导航前缀 —— cc 收起面板（与 normal 模式 cc 组成开关）、cs/cp/ct 直达 日程/优先级/标签、cd/cw/cm/cy 清除对应 repeat，600ms 超时或无匹配则取消
 *   d 是删除前缀（**仅 tags-select**）—— d + 序号 + Enter 删除对应编号标签（输入时高亮目标，Esc/非数字键取消）；
 *     600ms 内连按 dd 清空全部标签。schedule/priority 的 d 一律消费不动作（清除走 nav 的 Clear 项 + Enter）
 *   e 是重复前缀 —— ed/ew/em/ey 设置每天/每周/每月/每年重复
 *   j/k/0/$ 进入 nav 态（焦点锁定当前任务，绝不切换任务）：j → 第一个候选项、k → 最后一个、
 *     0 → 第一个、$ → 最后一个；nav 内 j/k 逐项移动、0/$ 直达首/尾、Enter 选中高亮项（唯一生效路径）→ 退回 select；
 *     Esc 退出 nav 回 select（再 Esc 关面板）。不按 j/k 时保留原快捷流：1/2/3 直接选、Enter 打开输入（schedule/tags）
 *   H/L 放行命令层横向切换 section；其余未知键一律消费，防止落到命令层触发 paste/delete/undo 等全局副作用
 */

import { Store } from '../state/store';
import { TaskPriority } from '../task';
import { parseScheduleFromString } from '../../utils/schedule-helper';
import type { ScheduleRepeat } from '../schedule';

/** e/c 前缀的 repeat 键位：d/w/m/y → daily/weekly/monthly/yearly */
const REPEAT_MAP: Record<string, ScheduleRepeat> = {
  d: 'daily', w: 'weekly', m: 'monthly', y: 'yearly',
};

/** edit 态由配置输入框独占，ConfigKeyHandler 与命令层均不处理 */
export function isConfigEditState(cs: string | undefined): boolean {
  return cs === 'schedule-edit' || cs === 'tags-edit';
}

const JUMP_MAP: Record<string, string> = { s: 'schedule-select', p: 'priority-select', t: 'tags-select' };

export class ConfigKeyHandler {
  private cPending = false;
  private cTimeout: ReturnType<typeof setTimeout> | null = null;
  /** repeat 设置前缀（ed/ew/em/ey）：e 后跟 d/w/m/y */
  private ePending = false;
  private eTimeout: ReturnType<typeof setTimeout> | null = null;
  /** 标签删除待确认态：d 开启 → 数字累加 1 基序号 → Enter 删除 / Esc 取消；600ms 内再按 d（dd）清空全部标签 */
  private dPending = false;
  private dBuffer = '';
  private dTaskId = 0;
  private dPendingAt = 0;

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

    // nav 态（j/k/0/$ 进入，焦点锁定当前任务的配置项，绝不切换任务）：
    // j/k 逐项移动、0/$ 直达首/尾，Enter 选中高亮项（唯一生效路径），Esc 只退出 nav 回 select，
    // H/L 放行切 section，其余键取消 nav 后按正常流程继续
    if ((state as any).configNavIndex > 0) {
      if (key === 'j' || key === 'k') {
        event.preventDefault();
        this.moveNav(taskDataManager, task, cs, key === 'j' ? 1 : -1);
        return true;
      }
      if (key === '0' || key === '$') {
        event.preventDefault();
        this.jumpNav(taskDataManager, task, cs, key === '0' ? 'first' : 'last');
        return true;
      }
      if (key === 'Enter') {
        event.preventDefault();
        this.activateNav(taskDataManager, task, cs, (state as any).configNavIndex);
        return true;
      }
      if (key === 'Escape') {
        event.preventDefault();
        taskDataManager.setConfigNavIndex(0);
        return true;
      }
      if (key === 'H' || key === 'L') {
        taskDataManager.setConfigNavIndex(0);
        return false;
      }
      taskDataManager.setConfigNavIndex(0); // 其余键取消 nav，继续正常流程
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
      // dd（600ms 内连按）：清空全部标签——与 dd 清除语义统一；慢速 d…d 不触发（防误触）
      if (key === 'd' && this.dBuffer === '' && Date.now() - this.dPendingAt < 600) {
        event.preventDefault();
        this.cancelTagDelete(taskDataManager);
        taskDataManager.updateTaskProperty(task.id, 'tags', []);
        return true;
      }
      this.cancelTagDelete(taskDataManager);
    }

    // c 前缀序列：cc 收起面板（开关）、cs/cp/ct 跳转、cd/cw/cm/cy 清除对应 repeat
    if (this.cPending) {
      this.cancelCPending();
      if (key === 'c') {
        // cc 与 normal 模式的 cc 组成对称开关：收起面板，绝不清除（清除走 nav 的 Clear 项）
        event.preventDefault();
        taskDataManager.setConfigState(task.id, undefined);
        return true;
      }
      if (REPEAT_MAP[key]) {
        // 仅清除与当前 repeat 匹配的（cd 清 daily、cw 清 weekly…）
        event.preventDefault();
        const task = state.tasks.find((t: any) => t.configState);
        const cur = task?.schedule?.repeat;
        if (cur === REPEAT_MAP[key]) {
          taskDataManager.setScheduleRepeat(task.id, undefined);
        }
        return true;
      }
      if (JUMP_MAP[key]) {
        event.preventDefault();
        taskDataManager.setConfigState(task.id, JUMP_MAP[key]);
        return true;
      }
    }

    // e 前缀序列：ed/ew/em/ey 设置每天/每星期/每月/每年重复
    if (this.ePending) {
      this.cancelEPending();
      if (REPEAT_MAP[key]) {
        event.preventDefault();
        taskDataManager.setScheduleRepeat(task.id, REPEAT_MAP[key]);
        return true;
      }
    }

    switch (key) {
      case 'd':
        if (cs === 'tags-select') {
          // d 开启删除待确认（删除仅限标签）：d+序号+Enter 删单个标签；600ms 内再按 d（dd）清空全部标签
          event.preventDefault();
          this.dPending = true;
          this.dTaskId = task.id;
          this.dBuffer = '';
          this.dPendingAt = Date.now();
          this.syncTagDeleteIndex(taskDataManager, task);
          return true;
        }
        // schedule/priority：d 一律消费不动作（清除走 nav 的 Clear 项 + Enter），不落到命令层触发全局删除
        event.preventDefault();
        return true;

      case 'c':
        event.preventDefault();
        this.cPending = true;
        this.cTimeout = setTimeout(() => {
          this.cPending = false;
          this.cTimeout = null;
        }, 600);
        return true;

      case 'e':
        event.preventDefault();
        this.ePending = true;
        this.eTimeout = setTimeout(() => {
          this.ePending = false;
          this.eTimeout = null;
        }, 600);
        return true;

      case '?':
        // 面板内按 ? 打开完整键位参考（清理待确认态，面板保持展开）
        event.preventDefault();
        this.cancelTagDelete(taskDataManager);
        taskDataManager.setConfigNavIndex(0);
        taskDataManager.toggleHelp('config');
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
        // H/L 放行命令层横向切换 section；j/k/0/$ 进入 nav 态（j/0 → 第一项、k/$ → 最后一项，Enter 才选中生效）；
        // 其余未知键一律消费，避免落到命令层产生全局副作用
        if (key === 'H' || key === 'L') return false;
        if (key === 'j') {
          event.preventDefault();
          this.jumpNav(taskDataManager, task, cs, 'first');
          return true;
        }
        if (key === 'k') {
          event.preventDefault();
          this.jumpNav(taskDataManager, task, cs, 'last');
          return true;
        }
        if (key === '0') {
          event.preventDefault();
          this.jumpNav(taskDataManager, task, cs, 'first');
          return true;
        }
        if (key === '$') {
          event.preventDefault();
          this.jumpNav(taskDataManager, task, cs, 'last');
          return true;
        }
        if (cs === 'schedule-select') this.handleSchedule(event, key, taskDataManager, task.id);
        else if (cs === 'priority-select') this.handlePriority(event, key, taskDataManager, task.id);
        // tags-select：无快捷选择，直接消费
        return true;
    }
  }

  private cancelEPending(): void {
    this.ePending = false;
    if (this.eTimeout) {
      clearTimeout(this.eTimeout);
      this.eTimeout = null;
    }
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

  /** schedule-select 的 nav 选项（固定排序：时间序 + 自定义，清除放最后——与面板 pill 顺序一致） */
  private static readonly SCHEDULE_OPTIONS = ['today', 'tomorrow', 'next_week', 'custom', 'clear'] as const;
  /** priority-select 的 nav 选项（固定排序：优先级降序 + 清除放最后——与面板 pill 顺序一致） */
  private static readonly PRIORITY_OPTIONS = ['high', 'medium', 'low', 'clear'] as const;

  /** nav 选项总数（tags = 标签数 + add + clear） */
  private navTotal(task: any, cs: string): number {
    if (cs === 'tags-select') return (task.tags?.length || 0) + 2;
    if (cs === 'schedule-select') return ConfigKeyHandler.SCHEDULE_OPTIONS.length;
    return ConfigKeyHandler.PRIORITY_OPTIONS.length;
  }

  /** j/0 → 第一项、k/$ → 最后一项（固定起点，与当前值无关）；nav 内 0/$ 直达首/尾 */
  private jumpNav(tdm: Store, task: any, cs: string, where: 'first' | 'last'): void {
    const total = this.navTotal(task, cs);
    tdm.setConfigNavIndex(where === 'first' ? 1 : total);
  }

  /** nav 态内 j/k 移动高亮（循环） */
  private moveNav(tdm: Store, task: any, cs: string, dir: 1 | -1): void {
    const total = this.navTotal(task, cs);
    const cur = (tdm.getTaskDataState() as any).configNavIndex || 1;
    tdm.setConfigNavIndex(((cur - 1 + dir) % total + total) % total + 1);
  }

  /** Enter 选中 nav 高亮项（唯一生效路径），随后退出 nav 回 select 态 */
  private activateNav(tdm: Store, task: any, cs: string, index: number): void {
    if (cs === 'schedule-select') {
      const opt = ConfigKeyHandler.SCHEDULE_OPTIONS[index - 1];
      if (opt === 'clear') tdm.updateTaskProperty(task.id, 'schedule', undefined);
      else if (opt === 'custom') tdm.setConfigState(task.id, 'schedule-edit');
      else {
        const s = parseScheduleFromString(opt);
        if (s) tdm.updateTaskProperty(task.id, 'schedule', s);
      }
    } else if (cs === 'priority-select') {
      const opt = ConfigKeyHandler.PRIORITY_OPTIONS[index - 1];
      if (opt === 'clear') tdm.updateTaskProperty(task.id, 'priority', undefined);
      else {
        const map: Record<string, TaskPriority> = { high: TaskPriority.HIGH, medium: TaskPriority.MEDIUM, low: TaskPriority.LOW };
        if (map[opt]) tdm.updateTaskProperty(task.id, 'priority', map[opt]);
      }
    } else if (cs === 'tags-select') {
      const tags = task.tags || [];
      if (index <= tags.length) {
        // 高亮在某个标签上：Enter 删除该标签
        tdm.updateTaskProperty(task.id, 'tags', tags.filter((_: string, i: number) => i !== index - 1));
      } else if (index === tags.length + 1) {
        // 高亮在 Add：Enter 打开标签输入（与默认 Enter 一致）
        tdm.setConfigState(task.id, 'tags-edit');
      } else {
        // 高亮在 Clear：Enter 清空全部标签
        tdm.updateTaskProperty(task.id, 'tags', []);
      }
    }
    tdm.setConfigNavIndex(0);
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
    this.dPendingAt = 0;
    tdm.setTagDeleteIndex(0);
  }
}
