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
    updateTaskProperty: vi.fn(),
    setConfigState: vi.fn((_id: number, s: string | undefined) => {
      current = makeTask(s);
    }),
  };
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

  it('cc in schedule-select clears schedule and stays', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    handler.handleKey(makeEvent('c'), 'c', tdm);
    const ok = handler.handleKey(makeEvent('c'), 'c', tdm);
    expect(ok).toBe(true);
    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'schedule', undefined);
    expect(tdm.setConfigState).not.toHaveBeenCalled();
  });

  it('cc in priority-select clears priority', () => {
    const tdm = createTDM(makeTask('priority-select'));
    handler.handleKey(makeEvent('c'), 'c', tdm);
    const ok = handler.handleKey(makeEvent('c'), 'c', tdm);
    expect(ok).toBe(true);
    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'priority', undefined);
  });

  it('cc in tags-select clears tags', () => {
    const tdm = createTDM(makeTask('tags-select'));
    handler.handleKey(makeEvent('c'), 'c', tdm);
    const ok = handler.handleKey(makeEvent('c'), 'c', tdm);
    expect(ok).toBe(true);
    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'tags', []);
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

  it('j/k are not handled by config handler (command layer switches sections)', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    expect(handler.handleKey(makeEvent('j'), 'j', tdm)).toBe(false);
    expect(handler.handleKey(makeEvent('k'), 'k', tdm)).toBe(false);
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
