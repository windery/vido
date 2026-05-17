import { describe, it, expect, beforeEach } from 'vitest';
import { CursorManager } from '../core/cursor-manager';
import { Task, TaskState } from '../task';
import { TaskDataState } from '../core/task-data-manager';
import { EditorMode } from '../editor';

function makeTask(id: number, content: string, overrides?: Partial<Task>): Task {
  const t = new Task(id);
  t.content = content;
  t.selected = overrides?.selected ?? true;
  t.status = overrides?.status ?? TaskState.CONTENT_NAVIGATION;
  t.cursorLine = overrides?.cursorLine ?? 0;
  t.cursorColumn = overrides?.cursorColumn ?? 0;
  return t;
}

function makeState(tasks: Task[]): TaskDataState {
  return {
    editorMode: EditorMode.CONTENT_NAVIGATION,
    taskState: TaskState.CONTENT_NAVIGATION,
    selectedTaskId: tasks.find((t) => t.selected)?.id,
    tasks,
    maxId: 100,
    clipboard: null,
    isTaskConfigVisible: false,
    isHelpVisible: false,
    lastlineContent: '',
    lastlineVisible: false,
    cursorPosition: undefined,
  };
}

describe('CursorManager', () => {
  let state: TaskDataState;
  let cm: CursorManager;

  beforeEach(() => {
    state = makeState([]);
    cm = new CursorManager(
      () => state,
      (updates) => { state = { ...state, ...updates } as TaskDataState; },
      () => ({ success: true })
    );
  });

  describe('moveCursorWordForward (w)', () => {
    it('jumps to next word on same line', () => {
      const task = makeTask(1, 'hello world foo');
      state = makeState([task]);
      cm.moveCursorWordForward();
      const t = state.tasks[0];
      expect(t.cursorLine).toBe(0);
      expect(t.cursorColumn).toBe(6); // start of 'world'
    });

    it('jumps across whitespace to next word', () => {
      const task = makeTask(1, 'hello   world');
      state = makeState([task]);
      cm.moveCursorWordForward();
      expect(state.tasks[0].cursorColumn).toBe(8); // start of 'world' after 3 spaces
    });

    it('jumps to next line when at end of current line', () => {
      const task = makeTask(1, 'a\n  b', { cursorLine: 0, cursorColumn: 1 });
      state = makeState([task]);
      cm.moveCursorWordForward();
      expect(state.tasks[0].cursorLine).toBe(1);
      expect(state.tasks[0].cursorColumn).toBe(2); // start of 'b'
    });

    it('stays in place when no next word', () => {
      const task = makeTask(1, 'end', { cursorColumn: 2 });
      state = makeState([task]);
      cm.moveCursorWordForward();
      const t = state.tasks[0];
      expect(t.cursorLine).toBe(0);
      expect(t.cursorColumn).toBe(2); // already past last word
    });

    it('skips current word from middle position', () => {
      const task = makeTask(1, 'abc def ghi', { cursorColumn: 1 }); // on 'b'
      state = makeState([task]);
      cm.moveCursorWordForward();
      expect(state.tasks[0].cursorColumn).toBe(4); // start of 'def'
    });
  });

  describe('moveCursorWordBackward (b)', () => {
    it('jumps to previous word start on same line', () => {
      const task = makeTask(1, 'hello world', { cursorColumn: 8 });
      state = makeState([task]);
      cm.moveCursorWordBackward();
      expect(state.tasks[0].cursorColumn).toBe(6); // start of 'world'
    });

    it('jumps across whitespace to previous word', () => {
      const task = makeTask(1, 'hello   world', { cursorColumn: 10 });
      state = makeState([task]);
      cm.moveCursorWordBackward();
      expect(state.tasks[0].cursorColumn).toBe(8); // start of 'world'
    });

    it('jumps to first word when on second word', () => {
      const task = makeTask(1, 'hello world', { cursorColumn: 6 });
      state = makeState([task]);
      cm.moveCursorWordBackward();
      expect(state.tasks[0].cursorColumn).toBe(0); // start of 'hello'
    });

    it('stays at start when already at first word', () => {
      const task = makeTask(1, 'hello world', { cursorColumn: 0 });
      state = makeState([task]);
      cm.moveCursorWordBackward();
      expect(state.tasks[0].cursorColumn).toBe(0);
    });
  });

  describe('moveCursorWordEnd (e)', () => {
    it('jumps to end of current word', () => {
      const task = makeTask(1, 'hello world', { cursorColumn: 0 });
      state = makeState([task]);
      cm.moveCursorWordEnd();
      expect(state.tasks[0].cursorColumn).toBe(4); // end of 'hello'
    });

    it('jumps to end of next word from middle of word', () => {
      const task = makeTask(1, 'hello world', { cursorColumn: 2 }); // on 'l'
      state = makeState([task]);
      cm.moveCursorWordEnd();
      expect(state.tasks[0].cursorColumn).toBe(4); // end of 'hello'
    });

    it('jumps to next word end when on whitespace', () => {
      const task = makeTask(1, 'hello world foo', { cursorColumn: 5 }); // on the space
      state = makeState([task]);
      cm.moveCursorWordEnd();
      expect(state.tasks[0].cursorColumn).toBe(10); // end of 'world'
    });
  });

  describe('no-op when not in CONTENT_NAVIGATION mode', () => {
    it('ignores word forward when task is in VIEWING state', () => {
      const task = makeTask(1, 'hello world', { status: TaskState.VIEWING, cursorColumn: 0 });
      state = makeState([task]);
      cm.moveCursorWordForward();
      expect(state.tasks[0].cursorColumn).toBe(0);
    });

    it('ignores word backward when no task selected', () => {
      const task = makeTask(1, 'hello', { selected: false, status: TaskState.VIEWING });
      state = makeState([task]);
      cm.moveCursorWordBackward();
      expect(state.tasks[0].cursorColumn).toBe(0);
    });
  });
});
