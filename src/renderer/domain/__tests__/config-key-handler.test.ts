import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigKeyHandler, isConfigEditState } from '../keyboard/config-key-handler';
import { Task, TaskPriority } from '../task';

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
  return {
    getTaskDataState: () => ({ tasks: [current] }),
    updateTaskProperty: vi.fn((_id: number, key: string, val: any) => {
      current = { ...current, [key]: val };
    }),
    setConfigState: vi.fn((_id: number, s: string | undefined) => {
      current = makeTask(s);
    }),
    setTagDeleteIndex: vi.fn(),
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

  it('dd in schedule-select clears schedule', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    handler.handleKey(makeEvent('d'), 'd', tdm);
    const ok = handler.handleKey(makeEvent('d'), 'd', tdm);
    expect(ok).toBe(true);
    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'schedule', undefined);
  });

  it('dd in priority-select clears priority', () => {
    const tdm = createTDM(makeTask('priority-select'));
    handler.handleKey(makeEvent('d'), 'd', tdm);
    const ok = handler.handleKey(makeEvent('d'), 'd', tdm);
    expect(ok).toBe(true);
    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'priority', undefined);
  });

  it('dd in tags-select clears all tags', () => {
    const tdm = createTDM(makeTagTask(['work', 'home']));
    handler.handleKey(makeEvent('d'), 'd', tdm);
    const ok = handler.handleKey(makeEvent('d'), 'd', tdm);
    expect(ok).toBe(true);
    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'tags', []);
  });

  it('slow d…d in schedule-select does NOT clear (600ms 防误触窗口)', () => {
    vi.useFakeTimers();
    const tdm = createTDM(makeTask('schedule-select'));
    handler.handleKey(makeEvent('d'), 'd', tdm);
    vi.advanceTimersByTime(700);
    const ok = handler.handleKey(makeEvent('d'), 'd', tdm);
    expect(ok).toBe(true);
    expect(tdm.updateTaskProperty).not.toHaveBeenCalled();
    vi.useRealTimers();
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

  it('d then other key cancels clear prefix and continues (1 quick-selects priority)', () => {
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

  it('j/k are not handled by config handler (task-level movement passes through)', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    expect(handler.handleKey(makeEvent('j'), 'j', tdm)).toBe(false);
    expect(handler.handleKey(makeEvent('k'), 'k', tdm)).toBe(false);
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

  it('非数字键取消待确认并放行命令层（j/k 任务级移动）', () => {
    const tdm = createTDM(makeTagTask(['a', 'b']));

    handler.handleKey(makeEvent('d'), 'd', tdm);
    const ok = handler.handleKey(makeEvent('j'), 'j', tdm);
    expect(ok).toBe(false); // 放行命令层做任务移动
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
