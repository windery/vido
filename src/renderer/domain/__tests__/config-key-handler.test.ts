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

  it('c in schedule-select clears and stays', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    handler.handleKey(makeEvent('c'), 'c', tdm);
    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'schedule', undefined);
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, 'schedule-select');
  });

  it('priority selection stays in priority-select', () => {
    const tdm = createTDM(makeTask('priority-select'));
    handler.handleKey(makeEvent('2'), '2', tdm);
    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'priority', TaskPriority.MEDIUM);
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, 'priority-select');
  });

  it('c in tags-select clears and stays', () => {
    const tdm = createTDM(makeTask('tags-select'));
    handler.handleKey(makeEvent('c'), 'c', tdm);
    expect(tdm.updateTaskProperty).toHaveBeenCalledWith(1, 'tags', []);
    expect(tdm.setConfigState).not.toHaveBeenCalled();
  });

  it('j/k are not handled by config handler', () => {
    const tdm = createTDM(makeTask('schedule-select'));
    expect(handler.handleKey(makeEvent('j'), 'j', tdm)).toBe(false);
    expect(handler.handleKey(makeEvent('k'), 'k', tdm)).toBe(false);
  });
});
