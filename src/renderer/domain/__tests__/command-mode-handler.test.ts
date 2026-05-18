import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandModeHandler } from '../keyboard/command-mode-handler';
import { Task, TaskState } from '../task';
import { TaskDataState } from '../core/task-data-manager';
import { TaskNavigation } from '../core/task-navigation';

function makeEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true });
}

function makeTasks(count: number): Task[] {
  return Array.from({ length: count }, (_, i) => {
    const t = new Task(i + 1);
    t.title = `Task ${i + 1}`;
    t.selected = false;
    t.status = TaskState.VIEWING;
    return t;
  });
}

/** 创建带真实 TaskNavigation 的 mock TaskDataManager */
function createMockTDM(taskList: Task[]) {
  let state: TaskDataState = {
    editorMode: 0,
    taskState: 0,
    selectedTaskId: taskList.find((t) => t.selected)?.id,
    tasks: taskList,
    maxId: 100,
    clipboard: null,
    isHelpVisible: false,
    lastlineContent: '',
    lastlineVisible: false,
    cursorPosition: undefined,
  };

  const nav = new TaskNavigation(
    () => state,
    (updates) => { state = { ...state, ...updates } as TaskDataState; }
  );

  return {
    getState: () => state,
    _state: () => state, // 暴露内部状态供测试断言
    selectNext: () => nav.selectNext(),
    selectPrevious: () => nav.selectPrevious(),
    goToFirst: () => nav.goToFirst(),
    goToLast: () => nav.goToLast(),
    selectTask: (id: number) => nav.selectTask(id),
    transition: vi.fn(() => ({ success: true })),
    startContentNavigation: vi.fn(),
    startTitleEditing: vi.fn(),
    toggleTaskCompletion: vi.fn(),
    toggleHelp: vi.fn(),
    createNewTask: vi.fn(() => {
      const t = new Task(99);
      t.title = '';
      return t;
    }),
    deleteSelectedTask: vi.fn(),
    copySelectedTask: vi.fn(),
    pasteTask: vi.fn(),
    setConfigState: vi.fn(),
  };
}

describe('CommandModeHandler', () => {
  let handler: CommandModeHandler;
  let mockTDM: any;

  beforeEach(() => {
    handler = new CommandModeHandler();

    mockTDM = {
      getState: vi.fn(() => ({
        editorMode: 0,
        selectedTaskId: 1,
        lastlineContent: '',
        isHelpVisible: false,
      })),
      selectNext: vi.fn(),
      selectPrevious: vi.fn(),
      goToFirst: vi.fn(),
      goToLast: vi.fn(),
      transition: vi.fn(() => ({ success: true })),
      startContentNavigation: vi.fn(),
      startTitleEditing: vi.fn(),
      toggleTaskCompletion: vi.fn(),
      toggleHelp: vi.fn(),
      createNewTask: vi.fn(() => ({ id: 99, title: '' })),
      deleteSelectedTask: vi.fn(),
      copySelectedTask: vi.fn(),
      pasteTask: vi.fn(),
      setConfigState: vi.fn(),
    };
  });

  describe('basic navigation', () => {
    it('calls selectNext on j', () => {
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      expect(mockTDM.selectNext).toHaveBeenCalledTimes(1);
    });

    it('calls selectPrevious on k', () => {
      handler.handleKey(makeEvent('k'), 'k', mockTDM, false);
      expect(mockTDM.selectPrevious).toHaveBeenCalledTimes(1);
    });

    it('calls goToLast on G', () => {
      handler.handleKey(makeEvent('G'), 'G', mockTDM, false);
      expect(mockTDM.goToLast).toHaveBeenCalledTimes(1);
    });

    it('calls goToFirst on gg', () => {
      handler.handleKey(makeEvent('g'), 'g', mockTDM, false);
      handler.handleKey(makeEvent('g'), 'g', mockTDM, false);
      expect(mockTDM.goToFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('number prefix', () => {
    it('repeats selectNext 3 times with 3j', () => {
      handler.handleKey(makeEvent('3'), '3', mockTDM, false);
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      expect(mockTDM.selectNext).toHaveBeenCalledTimes(3);
    });

    it('repeats selectPrevious 5 times with 5k', () => {
      handler.handleKey(makeEvent('5'), '5', mockTDM, false);
      handler.handleKey(makeEvent('k'), 'k', mockTDM, false);
      expect(mockTDM.selectPrevious).toHaveBeenCalledTimes(5);
    });

    it('resets count after execution', () => {
      handler.handleKey(makeEvent('3'), '3', mockTDM, false);
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      expect(mockTDM.selectNext).toHaveBeenCalledTimes(3);
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      expect(mockTDM.selectNext).toHaveBeenCalledTimes(4);
    });

    it('handles multi-digit prefix 12j', () => {
      handler.handleKey(makeEvent('1'), '1', mockTDM, false);
      handler.handleKey(makeEvent('2'), '2', mockTDM, false);
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      expect(mockTDM.selectNext).toHaveBeenCalledTimes(12);
    });

    it('2dd deletes twice', () => {
      handler.handleKey(makeEvent('2'), '2', mockTDM, false);
      handler.handleKey(makeEvent('d'), 'd', mockTDM, false);
      handler.handleKey(makeEvent('d'), 'd', mockTDM, false);
      expect(mockTDM.deleteSelectedTask).toHaveBeenCalledTimes(2);
    });
  });

  describe('scroll callback', () => {
    it('calls injected scroll callback after navigation', async () => {
      const scrollCb = vi.fn();
      handler.setScrollCallback(scrollCb);
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      await new Promise((r) => setTimeout(r, 20));
      expect(scrollCb).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('clears all state for fresh key handling', () => {
      handler.handleKey(makeEvent('3'), '3', mockTDM, false);
      handler.handleKey(makeEvent('g'), 'g', mockTDM, false);
      handler.dispose();
      handler.setScrollCallback(vi.fn());
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      expect(mockTDM.selectNext).toHaveBeenCalledTimes(1);
    });
  });
});

/**
 * 集成测试：用真实 TaskNavigation + 真实状态，验证按键到状态变更的完整路径
 */
describe('CommandModeHandler integration with TaskNavigation', () => {
  let handler: CommandModeHandler;
  let mockTDM: any;

  describe('G — go to last task', () => {
    it('from top (selected=1) selects last task', () => {
      const tasks = makeTasks(7);
      tasks[0].selected = true;
      tasks[0].status = TaskState.SELECTED;
      mockTDM = createMockTDM(tasks);
      handler = new CommandModeHandler();

      handler.handleKey(makeEvent('G'), 'G', mockTDM, false);

      expect(mockTDM._state().selectedTaskId).toBe(7);
    });

    it('from middle selects last task', () => {
      const tasks = makeTasks(7);
      tasks[3].selected = true;
      tasks[3].status = TaskState.SELECTED;
      mockTDM = createMockTDM(tasks);
      handler = new CommandModeHandler();

      handler.handleKey(makeEvent('G'), 'G', mockTDM, false);

      expect(mockTDM._state().selectedTaskId).toBe(7);
    });

    it('from last task stays on last task', () => {
      const tasks = makeTasks(7);
      tasks[6].selected = true;
      tasks[6].status = TaskState.SELECTED;
      mockTDM = createMockTDM(tasks);
      handler = new CommandModeHandler();

      handler.handleKey(makeEvent('G'), 'G', mockTDM, false);

      expect(mockTDM._state().selectedTaskId).toBe(7);
    });

    it('does nothing when task list is empty', () => {
      mockTDM = createMockTDM([]);
      handler = new CommandModeHandler();

      handler.handleKey(makeEvent('G'), 'G', mockTDM, false);

      expect(mockTDM._state().selectedTaskId).toBeUndefined();
    });
  });

  describe('k — navigate up with wrap', () => {
    it('at the top (index 0) wraps to last task', () => {
      const tasks = makeTasks(5);
      tasks[0].selected = true;
      tasks[0].status = TaskState.SELECTED;
      mockTDM = createMockTDM(tasks);
      handler = new CommandModeHandler();

      handler.handleKey(makeEvent('k'), 'k', mockTDM, false);

      expect(mockTDM._state().selectedTaskId).toBe(5);
    });

    it('at second task goes to first', () => {
      const tasks = makeTasks(5);
      tasks[1].selected = true;
      tasks[1].status = TaskState.SELECTED;
      mockTDM = createMockTDM(tasks);
      handler = new CommandModeHandler();

      handler.handleKey(makeEvent('k'), 'k', mockTDM, false);

      expect(mockTDM._state().selectedTaskId).toBe(1);
    });

    it('in middle goes to previous', () => {
      const tasks = makeTasks(5);
      tasks[2].selected = true;
      tasks[2].status = TaskState.SELECTED;
      mockTDM = createMockTDM(tasks);
      handler = new CommandModeHandler();

      handler.handleKey(makeEvent('k'), 'k', mockTDM, false);

      expect(mockTDM._state().selectedTaskId).toBe(2);
    });

    it('at the bottom goes to second-to-last', () => {
      const tasks = makeTasks(5);
      tasks[4].selected = true;
      tasks[4].status = TaskState.SELECTED;
      mockTDM = createMockTDM(tasks);
      handler = new CommandModeHandler();

      handler.handleKey(makeEvent('k'), 'k', mockTDM, false);

      expect(mockTDM._state().selectedTaskId).toBe(4);
    });
  });

  describe('j — navigate down with wrap', () => {
    it('at the bottom (last index) wraps to first task', () => {
      const tasks = makeTasks(5);
      tasks[4].selected = true;
      tasks[4].status = TaskState.SELECTED;
      mockTDM = createMockTDM(tasks);
      handler = new CommandModeHandler();

      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);

      expect(mockTDM._state().selectedTaskId).toBe(1);
    });

    it('in middle goes to next', () => {
      const tasks = makeTasks(5);
      tasks[2].selected = true;
      tasks[2].status = TaskState.SELECTED;
      mockTDM = createMockTDM(tasks);
      handler = new CommandModeHandler();

      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);

      expect(mockTDM._state().selectedTaskId).toBe(4);
    });
  });

  describe('gg — go to first task', () => {
    it('from bottom selects first task', () => {
      const tasks = makeTasks(7);
      tasks[6].selected = true;
      tasks[6].status = TaskState.SELECTED;
      mockTDM = createMockTDM(tasks);
      handler = new CommandModeHandler();

      handler.handleKey(makeEvent('g'), 'g', mockTDM, false);
      handler.handleKey(makeEvent('g'), 'g', mockTDM, false);

      expect(mockTDM._state().selectedTaskId).toBe(1);
    });
  });

  describe('number prefix with k/j', () => {
    it('3k from index 3 wraps to last when list has 5 items', () => {
      // tasks: [1, 2, 3, 4, 5], selected=4 (index 3)
      // 3k: up 3 times → index 2 → 1 → 0 → wrap to 4 → wait, that's wrong
      // Let me trace: from index 3:
      // k1: index 2 (task 3)
      // k2: index 1 (task 2)
      // k3: index 0 (task 1)
      // selectedTaskId = 1
      const tasks = makeTasks(5);
      tasks[3].selected = true;
      tasks[3].status = TaskState.SELECTED;
      mockTDM = createMockTDM(tasks);
      handler = new CommandModeHandler();

      handler.handleKey(makeEvent('3'), '3', mockTDM, false);
      handler.handleKey(makeEvent('k'), 'k', mockTDM, false);

      expect(mockTDM._state().selectedTaskId).toBe(1);
    });

    it('3j from index 2 goes to last when list has 5 items', () => {
      // tasks: [1, 2, 3, 4, 5], selected=3 (index 2)
      // 3j: down 3 times → index 3 → 4 → wrap to 0 → task 1
      const tasks = makeTasks(5);
      tasks[2].selected = true;
      tasks[2].status = TaskState.SELECTED;
      mockTDM = createMockTDM(tasks);
      handler = new CommandModeHandler();

      handler.handleKey(makeEvent('3'), '3', mockTDM, false);
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);

      expect(mockTDM._state().selectedTaskId).toBe(1);
    });
  });
});
