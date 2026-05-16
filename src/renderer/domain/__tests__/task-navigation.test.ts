import { describe, it, expect, beforeEach } from 'vitest';
import { TaskNavigation } from '../core/task-navigation';
import { Task, TaskState, TaskPriority } from '../task';
import { TaskDataState } from '../core/task-data-manager';

function makeState(tasks: Task[], overrides?: Partial<TaskDataState>): TaskDataState {
  return {
    editorMode: 0,
    taskState: 0,
    selectedTaskId: tasks.find((t) => t.selected)?.id,
    cursorPosition: undefined,
    isHelpVisible: false,
    lastlineContent: '',
    lastlineVisible: false,
    tasks,
    maxId: 100,
    clipboard: null,
    isTaskConfigVisible: false,
    ...overrides,
  };
}

function makeTasks(count: number): Task[] {
  return Array.from({ length: count }, (_, i) => {
    const t = new Task(i + 1);
    t.title = `Task ${i + 1}`;
    t.selected = false;
    t.status = TaskState.VIEWING;
    t.priority = TaskPriority.MEDIUM;
    return t;
  });
}

describe('TaskNavigation', () => {
  let nav: TaskNavigation;
  let state: TaskDataState;

  beforeEach(() => {
    const tasks = makeTasks(5);
    tasks[0].selected = true;
    tasks[0].status = TaskState.SELECTED;

    state = makeState(tasks);
    state.selectedTaskId = 1;

    nav = new TaskNavigation(
      () => state,
      (updates) => {
        state = { ...state, ...updates } as TaskDataState;
      }
    );
  });

  describe('selectPrevious (k key)', () => {
    it('wraps to last item when at the first item', () => {
      // selected = task 1 (index 0), press k → should wrap to task 5 (index 4)
      nav.selectPrevious();
      expect(state.selectedTaskId).toBe(5);
    });

    it('goes to previous item when in middle', () => {
      state.tasks[2].selected = true;
      state.tasks[2].status = TaskState.SELECTED;
      state.tasks[0].selected = false;
      state.tasks[0].status = TaskState.VIEWING;
      state.selectedTaskId = 3;

      nav.selectPrevious();
      expect(state.selectedTaskId).toBe(2);
    });

    it('does nothing with empty task list', () => {
      state = makeState([]);
      const nav2 = new TaskNavigation(
        () => state,
        (updates) => { state = { ...state, ...updates } as TaskDataState; }
      );
      nav2.selectPrevious();
      expect(state.selectedTaskId).toBeUndefined();
    });
  });

  describe('selectNext (j key)', () => {
    it('wraps to first item when at the last item', () => {
      state.tasks[4].selected = true;
      state.tasks[4].status = TaskState.SELECTED;
      state.tasks[0].selected = false;
      state.tasks[0].status = TaskState.VIEWING;
      state.selectedTaskId = 5;

      nav.selectNext();
      expect(state.selectedTaskId).toBe(1);
    });

    it('goes to next item when in middle', () => {
      nav.selectNext();
      expect(state.selectedTaskId).toBe(2);
    });
  });

  describe('goToFirst / goToLast', () => {
    it('goToFirst selects the first task', () => {
      state.tasks[3].selected = true;
      state.selectedTaskId = 4;
      nav.goToFirst();
      expect(state.selectedTaskId).toBe(1);
    });

    it('goToLast selects the last task', () => {
      nav.goToLast();
      expect(state.selectedTaskId).toBe(5);
    });
  });

  describe('filteredTasks', () => {
    it('returns all tasks when no search filter', () => {
      expect(nav.filteredTasks).toHaveLength(5);
    });

    it('filters by search term', () => {
      state.tasks[0].title = 'hello world';
      state.tasks[1].title = 'foo bar';
      state.lastlineContent = '/hello';
      expect(nav.filteredTasks).toHaveLength(1);
    });
  });
});
