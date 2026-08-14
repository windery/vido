import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigKeyHandler, isConfigEditState } from '../keyboard/config-key-handler';
import { Task, TaskPriority } from '../task';
import { createSpecificDateTimeSchedule } from '../../utils/schedule-helper';
import { getCurrentDate } from '../../utils/date-formatter';

function makeEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
}

function makeTask(configState: string | undefined): Task {
  const t = new Task(1);
  t.configState = configState;
  return t;
}

function createTDM(task: Task): any {
  let current = task;
  let navIndex = 0;
  return {
    getTaskDataState: () => ({ tasks: [current], configNavIndex: navIndex }),
    updateTaskProperty: vi.fn((_id: number, key: string, val: any) => {
      current = { ...current, [key]: val };
    }),
    setConfigState: vi.fn((_id: number, s: string | undefined) => {
      current = makeTask(s);
    }),
    setTagDeleteIndex: vi.fn(),
    setConfigNavIndex: vi.fn((n: number) => {
      navIndex = n;
    }),
    toggleHelp: vi.fn(),
    _nav: () => navIndex,
  };
}

function makeTagTask(tags: string[]): Task {
  const t = new Task(1);
  t.configState = 'tags-select';
  t.tags = tags;
  return t;
}

describe('isConfigEditState', () => {
  it('identifies edit states', () => {
    expect(isConfigEditState('schedule-edit')).toBe(true);
    expect(isConfigEditState('tags-edit')).toBe(true);
    expect(isConfigEditState('schedule-select')).toBe(false);
    expect(isConfigEditState('priority-select')).toBe(false);
    expect(isConfigEditState('tags-select')).toBe(false);
    expect(isConfigEditState(undefined)).toBe(false);
  });
});

describe('ConfigKeyHandler state machine', () => {
  let handler: ConfigKeyHandler;

  beforeEach(() => {
    handler = new ConfigKeyHandler();
  });

  it('Enter in schedule-select opens schedule-edit', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    const ok = handler.handleKey(makeEvent('Enter'), 'Enter', tdm);
    expect(ok).toBe(true);
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, 'schedule-edit');
  });

  it('Enter in tags-select opens tags-edit', () => {
    const tdm = createTDM(makeTask('tags-select'));
    const ok = handler.handleKey(makeEvent('Enter'), 'Enter', tdm);
    expect(ok).toBe(true);
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, 'tags-edit');
  });

  it('Enter in priority-select is consumed without action (no edit state)', () => {
    const tdm = createTDM(makeTask('priority-select'));
    const ok = handler.handleKey(makeEvent('Enter'), 'Enter', tdm);
    expect(ok).toBe(true);
    expect(tdm.setConfigState).not.toHaveBeenCalled();
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
  });

  it('edit states are not intercepted (input owns them)', () => {
    const tdm = createTDM(makeTask('schedule-edit'));
    const ok = handler.handleKey(makeEvent('Enter'), 'Enter', tdm);
    expect(ok).toBe(false);
    expect(tdm.setConfigState).not.toHaveBeenCalled();
  });

  it('Escape in select closes config', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    const ok = handler.handleKey(makeEvent('Escape'), 'Escape', tdm);
    expect(ok).toBe(true);
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, undefined);
  });

  it('1/2/3 in schedule-select sets schedule and stays', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    handler.handleKey(makeEvent('2'), '2', tdm);
    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'schedule', expect.anything());
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, 'schedule-select');
  });

  it('priority selection stays in priority-select', () => {
    const tdm = createTDM(makeTask('priority-select'));
    handler.handleKey(makeEvent('2'), '2', tdm);
    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'priority', TaskPriority.MEDIUM);
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, 'priority-select');
  });

  it('cc in panel closes config (toggle) and never clears', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    handler.handleKey(makeEvent('c'), 'c', tdm);
    const ok = handler.handleKey(makeEvent('c'), 'c', tdm);
    expect(ok).toBe(true);
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, undefined);
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
  });

  it('d/dd 在 schedule-select 无副作用（删除仅限 tags，清除走 nav）', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    handler.handleKey(makeEvent('d'), 'd', tdm);
    const ok = handler.handleKey(makeEvent('d'), 'd', tdm);
    expect(ok).toBe(true);
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
  });

  it('d/dd 在 priority-select 无副作用（删除仅限 tags，清除走 nav）', () => {
    const tdm = createTDM(makeTask('priority-select'));
    handler.handleKey(makeEvent('d'), 'd', tdm);
    const ok = handler.handleKey(makeEvent('d'), 'd', tdm);
    expect(ok).toBe(true);
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
  });

  it('dd in tags-select clears all tags', () => {
    const tdm = createTDM(makeTagTask(['work', 'home']));
    handler.handleKey(makeEvent('d'), 'd', tdm);
    const ok = handler.handleKey(makeEvent('d'), 'd', tdm);
    expect(ok).toBe(true);
    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'tags', []);
  });

  it('schedule-select 连按 d 无任何副作用（无删除语义）', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    handler.handleKey(makeEvent('d'), 'd', tdm);
    handler.handleKey(makeEvent('d'), 'd', tdm);
    handler.handleKey(makeEvent('d'), 'd', tdm);
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
  });

  it('slow d…d in tags-select does NOT clear all tags (600ms 防误触窗口)', () => {
    vi.useFakeTimers();
    const tdm = createTDM(makeTagTask(['a', 'b']));
    handler.handleKey(makeEvent('d'), 'd', tdm);
    vi.advanceTimersByTime(700);
    const ok = handler.handleKey(makeEvent('d'), 'd', tdm);
    expect(ok).toBe(true);
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('d 后其他键按正常流程继续（1 快捷选 priority 仍生效）', () => {
    const tdm = createTDM(makeTask('priority-select'));
    handler.handleKey(makeEvent('d'), 'd', tdm);
    handler.handleKey(makeEvent('1'), '1', tdm);
    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'priority', TaskPriority.HIGH);
  });

  it('single d in schedule-select is consumed without action (不落到命令层删任务)', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    const ok = handler.handleKey(makeEvent('d'), 'd', tdm);
    expect(ok).toBe(true);
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
  });

  it('cs/cp/ct jump between sections (not clear, not paste)', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    const ok = handler.handleKey(makeEvent('p'), 'p', tdm); // after c
    // 先按 c 开启前缀，再按 p → 跳转 priority-select，且不触发 paste
    handler.handleKey(makeEvent('c'), 'c', tdm);
    const ok2 = handler.handleKey(makeEvent('p'), 'p', tdm);
    expect(ok2).toBe(true);
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, 'priority-select');
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
    expect(ok).toBe(true); // p 单独按也被消费，不落到命令层
  });

  it('c prefix cancels on non-target key', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    handler.handleKey(makeEvent('c'), 'c', tdm);
    const ok = handler.handleKey(makeEvent('Enter'), 'Enter', tdm);
    expect(ok).toBe(true);
    // c 前缀取消后 Enter 仍走正常流程 → 打开 schedule-edit
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, 'schedule-edit');
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
  });

  it('single c alone performs no action until timeout or second key', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    const ok = handler.handleKey(makeEvent('c'), 'c', tdm);
    expect(ok).toBe(true);
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
    expect(tdm.setConfigState).not.toHaveBeenCalled();
  });

  it('H/L are not handled by config handler (command layer switches sections)', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    expect(handler.handleKey(makeEvent('H'), 'H', tdm)).toBe(false);
    expect(handler.handleKey(makeEvent('L'), 'L', tdm)).toBe(false);
  });

  it('j/k are consumed by config handler (never switch tasks)', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    expect(handler.handleKey(makeEvent('j'), 'j', tdm)).toBe(true);
    expect(handler.handleKey(makeEvent('k'), 'k', tdm)).toBe(true);
    expect(tdm.setConfigState).not.toHaveBeenCalled();
  });

  it('unknown keys are consumed to prevent leaking to command layer', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    // p/d/u/y/o/space 等在面板内被消费，不触发 paste/delete/undo/创建/完成
    for (const k of ['p', 'd', 'u', 'y', 'o', ' ', 'f', 'G']) {
      expect(handler.handleKey(makeEvent(k), k, tdm)).toBe(true);
    }
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
  });
});

describe('ConfigKeyHandler 标签删除（d + 序号 + Enter）', () => {
  let handler: ConfigKeyHandler;

  beforeEach(() => {
    handler = new ConfigKeyHandler();
  });

  it('d 开启删除待确认，数字累加并高亮目标序号', () => {
    const tdm = createTDM(makeTagTask(['work', 'urgent', 'home']));

    handler.handleKey(makeEvent('d'), 'd', tdm);
    expect(tdm.setTagDeleteIndex).toHaveBeenLastCalledWith(0); // 空 buffer 不亮

    handler.handleKey(makeEvent('2'), '2', tdm);
    expect(tdm.setTagDeleteIndex).toHaveBeenLastCalledWith(2); // 高亮第 2 个标签
  });

  it('两位序号累加（d11 → 高亮第 11 个）', () => {
    const tags = Array.from({ length: 11 }, (_, i) => `t${i + 1}`);
    const tdm = createTDM(makeTagTask(tags));

    handler.handleKey(makeEvent('d'), 'd', tdm);
    handler.handleKey(makeEvent('1'), '1', tdm);
    expect(tdm.setTagDeleteIndex).toHaveBeenLastCalledWith(1);
    handler.handleKey(makeEvent('1'), '1', tdm);
    expect(tdm.setTagDeleteIndex).toHaveBeenLastCalledWith(11);
  });

  it('越界序号不高亮', () => {
    const tdm = createTDM(makeTagTask(['a', 'b']));

    handler.handleKey(makeEvent('d'), 'd', tdm);
    handler.handleKey(makeEvent('9'), '9', tdm);
    expect(tdm.setTagDeleteIndex).toHaveBeenLastCalledWith(0);
  });

  it('Enter 确认删除目标标签并清除高亮', () => {
    const tdm = createTDM(makeTagTask(['work', 'urgent', 'home']));

    handler.handleKey(makeEvent('d'), 'd', tdm);
    handler.handleKey(makeEvent('2'), '2', tdm);
    handler.handleKey(makeEvent('Enter'), 'Enter', tdm);

    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'tags', ['work', 'home']);
    expect(tdm.setTagDeleteIndex).toHaveBeenLastCalledWith(0);
  });

  it('Esc 取消删除，不修改标签', () => {
    const tdm = createTDM(makeTagTask(['a', 'b']));

    handler.handleKey(makeEvent('d'), 'd', tdm);
    handler.handleKey(makeEvent('1'), '1', tdm);
    handler.handleKey(makeEvent('Escape'), 'Escape', tdm);

    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
    expect(tdm.setTagDeleteIndex).toHaveBeenLastCalledWith(0);
  });

  it('无效序号 Enter 取消而不删除', () => {
    const tdm = createTDM(makeTagTask(['a', 'b']));

    handler.handleKey(makeEvent('d'), 'd', tdm);
    handler.handleKey(makeEvent('5'), '5', tdm);
    handler.handleKey(makeEvent('Enter'), 'Enter', tdm);
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
  });

  it('非数字键取消待确认并消费（j/k 不再切任务）', () => {
    const tdm = createTDM(makeTagTask(['a', 'b']));

    handler.handleKey(makeEvent('d'), 'd', tdm);
    const ok = handler.handleKey(makeEvent('j'), 'j', tdm);
    expect(ok).toBe(true); // 面板内消费，不落命令层
    expect(tdm.setTagDeleteIndex).toHaveBeenLastCalledWith(0);
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
  });

  it('离开 tags-select 后残留删除态被清理（不再误累加）', () => {
    const tdm = createTDM(makeTagTask(['a', 'b']));
    handler.handleKey(makeEvent('d'), 'd', tdm);

    // 模拟切到 priority-select（新任务实例，不再持有 tags）
    const t2 = new Task(1);
    t2.configState = 'priority-select';
    tdm.getTaskDataState = () => ({ tasks: [t2] });

    handler.handleKey(makeEvent('1'), '1', tdm);
    // 残留删除态已取消，数字按 priority 快捷选择处理
    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'priority', TaskPriority.HIGH);
  });
});


describe('ConfigKeyHandler j/k nav 导航（Enter 才选中生效，绝不切任务）', () => {
  let handler: ConfigKeyHandler;

  beforeEach(() => {
    handler = new ConfigKeyHandler();
  });

  const cur = (tdm: any) => tdm.getTaskDataState().tasks[0];

  it('j 从第一项开始（只高亮不生效），Enter 才应用', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    handler.handleKey(makeEvent('j'), 'j', tdm); // j → 第一项 = 今天(1)
    expect(tdm._nav()).toBe(1);
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled(); // 导航不生效
    handler.handleKey(makeEvent('Enter'), 'Enter', tdm);
    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'schedule', expect.anything());
    expect(tdm._nav()).toBe(0); // 选中后退出 nav
    expect((cur(tdm).schedule as any).quickTime?.date).toBe(getCurrentDate());
  });

  it('k 从最后一项开始；0/$ 直达首尾（含 nav 态内）', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    handler.handleKey(makeEvent('k'), 'k', tdm); // k → 最后一项 = 清除(5)
    expect(tdm._nav()).toBe(5);
    handler.handleKey(makeEvent('0'), '0', tdm); // nav 内 0 → 第一项(1)
    expect(tdm._nav()).toBe(1);
    handler.handleKey(makeEvent('$'), '$', tdm); // nav 内 $ → 最后一项(5)
    expect(tdm._nav()).toBe(5);
    handler.handleKey(makeEvent('0'), '0', tdm); // 0 → 第一项(1)
    expect(tdm._nav()).toBe(1);
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
  });

  it('nav 内 j/k 逐项循环移动，Esc 只退出 nav 不关面板', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    handler.handleKey(makeEvent('j'), 'j', tdm); // → 1
    handler.handleKey(makeEvent('j'), 'j', tdm); // → 2
    handler.handleKey(makeEvent('j'), 'j', tdm); // → 3
    handler.handleKey(makeEvent('j'), 'j', tdm); // → 4 (custom)
    handler.handleKey(makeEvent('j'), 'j', tdm); // → 5 (clear)
    handler.handleKey(makeEvent('j'), 'j', tdm); // → 回绕 1
    expect(tdm._nav()).toBe(1);
    handler.handleKey(makeEvent('k'), 'k', tdm); // → 回绕 5
    expect(tdm._nav()).toBe(5);
    handler.handleKey(makeEvent('Escape'), 'Escape', tdm);
    expect(tdm._nav()).toBe(0);
    expect(tdm.setConfigState).not.toHaveBeenCalled(); // 面板仍在，再 Esc 才关
  });

  it('$ 直达 Clear，Enter 选中清除日程', () => {
    const t = makeTask('schedule-select');
    t.schedule = createSpecificDateTimeSchedule('2026-05-08 10:00:00');
    const tdm = createTDM(t);
    handler.handleKey(makeEvent('$'), '$', tdm); // $ → 最后一项 = 清除(5)
    expect(tdm._nav()).toBe(5);
    handler.handleKey(makeEvent('Enter'), 'Enter', tdm);
    expect(cur(tdm).schedule).toBeUndefined();
    expect(tdm._nav()).toBe(0);
  });

  it('Enter 选中 Custom 项打开 schedule-edit（与默认 Enter 语义一致）', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    for (let i = 0; i < 4; i++) handler.handleKey(makeEvent('j'), 'j', tdm); // → 4 = custom
    expect(tdm._nav()).toBe(4);
    handler.handleKey(makeEvent('Enter'), 'Enter', tdm);
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, 'schedule-edit');
  });

  it('不按 j/k 时 Enter 仍直接打开输入（原快捷流不受影响）', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    handler.handleKey(makeEvent('Enter'), 'Enter', tdm);
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, 'schedule-edit');
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
  });

  it('priority：j 从第一项 !!! 开始，Enter 选中生效', () => {
    const tdm = createTDM(makeTask('priority-select'));
    handler.handleKey(makeEvent('j'), 'j', tdm); // j → 第一项 = !!!(1)
    expect(tdm._nav()).toBe(1);
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
    handler.handleKey(makeEvent('Enter'), 'Enter', tdm);
    expect(cur(tdm).priority).toBe(TaskPriority.HIGH);
    expect(tdm._nav()).toBe(0);
  });

  it('priority：k 从最后一项（清除）开始，与当前值无关', () => {
    const t = makeTask('priority-select');
    t.priority = TaskPriority.LOW;
    const tdm = createTDM(t);
    handler.handleKey(makeEvent('k'), 'k', tdm); // k → 最后一项 = 清除(4)
    expect(tdm._nav()).toBe(4);
  });

  it('priority：$ 直达 Clear，Enter 选中清除优先级', () => {
    const t = makeTask('priority-select');
    t.priority = TaskPriority.HIGH;
    const tdm = createTDM(t);
    handler.handleKey(makeEvent('$'), '$', tdm); // $ → 最后一项 = 清除(4)
    expect(tdm._nav()).toBe(4);
    handler.handleKey(makeEvent('Enter'), 'Enter', tdm);
    expect(cur(tdm).priority).toBeUndefined();
  });

  it('tags：j 从第一个标签开始，Enter 删除高亮标签', () => {
    const tdm = createTDM(makeTagTask(['work', 'home']));
    handler.handleKey(makeEvent('j'), 'j', tdm); // j → 第一项 = tag1(1)
    expect(tdm._nav()).toBe(1);
    handler.handleKey(makeEvent('Enter'), 'Enter', tdm);
    expect(cur(tdm).tags).toEqual(['home']);
    expect(tdm._nav()).toBe(0);
  });

  it('tags：j 逐项到 Add 后 Enter 打开 tags-edit；k 直达 Clear 后 Enter 清空', () => {
    const tdm = createTDM(makeTagTask(['a']));
    handler.handleKey(makeEvent('j'), 'j', tdm); // → tag1(1)
    handler.handleKey(makeEvent('j'), 'j', tdm); // → Add(2)
    expect(tdm._nav()).toBe(2);
    handler.handleKey(makeEvent('Enter'), 'Enter', tdm);
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, 'tags-edit');

    const tdm2 = createTDM(makeTagTask(['a']));
    handler.handleKey(makeEvent('$'), '$', tdm2); // $ → 最后一项 = Clear(3)
    expect(tdm2._nav()).toBe(3);
    handler.handleKey(makeEvent('Enter'), 'Enter', tdm2);
    expect(cur(tdm2).tags).toEqual([]);
  });

  it('? 打开完整键位参考，并清理 nav/删除待确认态（面板保持展开）', () => {
    const tdm = createTDM(makeTagTask(['a', 'b']));
    handler.handleKey(makeEvent('d'), 'd', tdm); // 删除待确认
    handler.handleKey(makeEvent('j'), 'j', tdm); // 进入 nav
    const ok = handler.handleKey(makeEvent('?'), '?', tdm);
    expect(ok).toBe(true);
    expect(tdm.toggleHelp).toHaveBeenCalledWith('config-tags');
    expect(tdm._nav()).toBe(0);
    expect(tdm.setTagDeleteIndex).toHaveBeenLastCalledWith(0);
  });

  it('nav 中按 d 取消 nav 且无副作用（priority 无删除语义）', () => {
    const tdm = createTDM(makeTask('priority-select'));
    handler.handleKey(makeEvent('j'), 'j', tdm); // nav = 1
    handler.handleKey(makeEvent('d'), 'd', tdm);
    expect(tdm._nav()).toBe(0); // nav 被取消，d 被消费
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
  });

  it('j/k 全程不切任务（无 setConfigState 副作用、无数据变更）', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    handler.handleKey(makeEvent('j'), 'j', tdm);
    handler.handleKey(makeEvent('k'), 'k', tdm);
    handler.handleKey(makeEvent('j'), 'j', tdm);
    handler.handleKey(makeEvent('Escape'), 'Escape', tdm);
    expect(tdm.setConfigState).not.toHaveBeenCalled();
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
  });
});
