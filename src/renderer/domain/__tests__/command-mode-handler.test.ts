import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandModeHandler } from '../keyboard/command-mode-handler';
import { Task, TaskState } from '../task';
import { TaskList } from '../entities/task-list';

function makeEvent(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true, ...init });
}

function makeTasks(count: number): Task[] {
  return Array.from({ length: count }, (_, i) => {
    const t = new Task(i + 1);
    t.title = `Task ${i + 1}`;
    t.selected = i === 0;
    t.status = i === 0 ? TaskState.SELECTED : TaskState.VIEWING;
    return t;
  });
}

function createMockTDM(taskList: Task[]): any {
  let list = new TaskList(taskList);
  return {
    getState: () => ({ editorMode: 0, selectedTaskId: list.selected?.id, tasks: list.items, lastlineContent: '', isHelpVisible: false }),
    selectNext: () => { list = list.selectNext(); },
    selectPrevious: () => { list = list.selectPrevious(); },
    goToFirst: () => { list = list.goToFirst(); },
    goToLast: () => { list = list.goToLast(); },
    transition: vi.fn(() => ({ success: true })),
    startContentNavigation: vi.fn(),
    startTitleEditing: vi.fn(),
    toggleTaskCompletion: vi.fn(),
    toggleFlag: vi.fn(),
    toggleHelp: vi.fn(),
    createNewTask: vi.fn(() => { const t = new Task(99); t.title = ''; return t; }),
    deleteSelectedTask: vi.fn(),
    copySelectedTask: vi.fn(),
    pasteTask: vi.fn(),
    setConfigState: vi.fn(),
    _list: () => list,
  };
}

describe('CommandModeHandler', () => {
  let handler: CommandModeHandler;
  let mockTDM: any;

  beforeEach(() => {
    handler = new CommandModeHandler();
    mockTDM = {
      getState: vi.fn(() => ({ editorMode: 0, selectedTaskId: 1, lastlineContent: '', isHelpVisible: false })),
      selectNext: vi.fn(), selectPrevious: vi.fn(),
      goToFirst: vi.fn(), goToLast: vi.fn(),
      transition: vi.fn(() => ({ success: true })),
      startContentNavigation: vi.fn(), startTitleEditing: vi.fn(),
      toggleTaskCompletion: vi.fn(), toggleFlag: vi.fn(), toggleHelp: vi.fn(),
      createNewTask: vi.fn(() => ({ id: 99, title: '' })),
      deleteSelectedTask: vi.fn(), copySelectedTask: vi.fn(), pasteTask: vi.fn(),
      setConfigState: vi.fn(), undo: vi.fn(), redo: vi.fn(),
      searchNext: vi.fn(),
      indentSelectedTask: vi.fn(), unindentSelectedTask: vi.fn(),
    };
  });

  it('Tab calls indentSelectedTask', () => {
    handler.handleKey(makeEvent('Tab'), 'Tab', mockTDM, false);
    expect(mockTDM.indentSelectedTask).toHaveBeenCalled();
    expect(mockTDM.unindentSelectedTask).not.toHaveBeenCalled();
  });
  it('Shift+Tab calls unindentSelectedTask', () => {
    handler.handleKey(makeEvent('Tab', { shiftKey: true }), 'Tab', mockTDM, false);
    expect(mockTDM.unindentSelectedTask).toHaveBeenCalled();
    expect(mockTDM.indentSelectedTask).not.toHaveBeenCalled();
  });
  it('j calls selectNext', () => { handler.handleKey(makeEvent('j'), 'j', mockTDM, false); expect(mockTDM.selectNext).toHaveBeenCalled(); });
  it('k calls selectPrevious', () => { handler.handleKey(makeEvent('k'), 'k', mockTDM, false); expect(mockTDM.selectPrevious).toHaveBeenCalled(); });
  it('G calls goToLast', () => { handler.handleKey(makeEvent('G'), 'G', mockTDM, false); expect(mockTDM.goToLast).toHaveBeenCalled(); });
  it('gg calls goToFirst', () => { handler.handleKey(makeEvent('g'), 'g', mockTDM, false); handler.handleKey(makeEvent('g'), 'g', mockTDM, false); expect(mockTDM.goToFirst).toHaveBeenCalled(); });

  it('3j repeats selectNext 3 times', () => {
    handler.handleKey(makeEvent('3'), '3', mockTDM, false);
    handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
    expect(mockTDM.selectNext).toHaveBeenCalledTimes(3);
  });

  it('u calls undo', () => { handler.handleKey(makeEvent('u'), 'u', mockTDM, false); expect(mockTDM.undo).toHaveBeenCalled(); });
  it('f calls toggleFlag', () => { handler.handleKey(makeEvent('f'), 'f', mockTDM, false); expect(mockTDM.toggleFlag).toHaveBeenCalled(); });
  it('Ctrl+R calls redo', () => { handler.handleKey(new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, bubbles: true }), 'r', mockTDM, false); expect(mockTDM.redo).toHaveBeenCalled(); });
  it('n calls searchNext(1)', () => { handler.handleKey(makeEvent('n'), 'n', mockTDM, false); expect(mockTDM.searchNext).toHaveBeenCalledWith(1); });
  it('N calls searchNext(-1)', () => { handler.handleKey(makeEvent('N'), 'N', mockTDM, false); expect(mockTDM.searchNext).toHaveBeenCalledWith(-1); });
});

describe('CommandModeHandler integration with TaskList', () => {
  let handler: CommandModeHandler;

  it('G from top selects last', () => {
    const tasks = makeTasks(7); tasks[0].selected = true; tasks[0].status = TaskState.SELECTED;
    const tdm = createMockTDM(tasks);
    handler = new CommandModeHandler();
    handler.handleKey(makeEvent('G'), 'G', tdm, false);
    expect(tdm._list().selected?.id).toBe(7);
  });

  it('k at top wraps to last', () => {
    const tasks = makeTasks(5); tasks[0].selected = true; tasks[0].status = TaskState.SELECTED;
    const tdm = createMockTDM(tasks);
    handler = new CommandModeHandler();
    handler.handleKey(makeEvent('k'), 'k', tdm, false);
    expect(tdm._list().selected?.id).toBe(5);
  });

  it('cc calls setConfigState', () => {
    const tasks = makeTasks(3);
    const tdm = createMockTDM(tasks);
    handler = new CommandModeHandler();
    handler.handleKey(makeEvent('c'), 'c', tdm, false);
    handler.handleKey(makeEvent('c'), 'c', tdm, false);
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, 'schedule-select');
  });

  it('L cycles config section forward (schedule → priority)', () => {
    const tasks = makeTasks(2);
    tasks[0].configState = 'schedule-select';
    const tdm = createMockTDM(tasks);
    handler = new CommandModeHandler();
    handler.handleKey(makeEvent('L'), 'L', tdm, false);
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, 'priority-select');
  });

  it('H cycles config section backward (schedule → tags, wraps)', () => {
    const tasks = makeTasks(2);
    tasks[0].configState = 'schedule-select';
    const tdm = createMockTDM(tasks);
    handler = new CommandModeHandler();
    handler.handleKey(makeEvent('H'), 'H', tdm, false);
    expect(tdm.setConfigState).toHaveBeenCalledWith(1, 'tags-select');
  });

  it('j/k keep task-level movement when config is open (no section switch)', () => {
    const tasks = makeTasks(2);
    tasks[0].configState = 'schedule-select';
    const tdm = createMockTDM(tasks);
    handler = new CommandModeHandler();
    handler.handleKey(makeEvent('j'), 'j', tdm, false);
    expect(tdm.setConfigState).not.toHaveBeenCalled();
    expect(tdm._list().selected?.id).toBe(2); // 任务下移
  });

  it('H/L without config open are consumed (no-op, no task movement)', () => {
    const tasks = makeTasks(3);
    const tdm = createMockTDM(tasks);
    handler = new CommandModeHandler();
    handler.handleKey(makeEvent('L'), 'L', tdm, false);
    handler.handleKey(makeEvent('H'), 'H', tdm, false);
    expect(tdm.setConfigState).not.toHaveBeenCalled();
    expect(tdm._list().selected?.id).toBe(1); // 不移动任务
  });
});
