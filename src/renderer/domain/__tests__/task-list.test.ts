import { describe, it, expect } from 'vitest';
import { TaskList } from '../entities/task-list';
import { Task, TaskState } from '../task';

function makeTasks(n: number): Task[] {
  return Array.from({ length: n }, (_, i) => {
    const t = new Task(i + 1);
    t.title = `Task ${i + 1}`;
    t.selected = i === 0;
    t.status = i === 0 ? TaskState.SELECTED : TaskState.VIEWING;
    return t;
  });
}

describe('TaskList', () => {
  describe('selectNext', () => {
    it('goes to next task', () => {
      const list = new TaskList(makeTasks(5));
      const result = list.selectNext();
      expect(result.selected?.id).toBe(2);
    });

    it('wraps to first at end', () => {
      const tasks = makeTasks(5);
      tasks[4].selected = true; tasks[4].status = TaskState.SELECTED;
      tasks[0].selected = false; tasks[0].status = TaskState.VIEWING;
      const result = new TaskList(tasks).selectNext();
      expect(result.selected?.id).toBe(1);
    });

    it('is immutable', () => {
      const list = new TaskList(makeTasks(5));
      const result = list.selectNext();
      expect(list.selected?.id).toBe(1); // original unchanged
      expect(result.selected?.id).toBe(2);
    });
  });

  describe('selectPrevious', () => {
    it('wraps to last at top', () => {
      const result = new TaskList(makeTasks(5)).selectPrevious();
      expect(result.selected?.id).toBe(5);
    });
  });

  describe('goToFirst / goToLast', () => {
    it('goes to first', () => {
      const tasks = makeTasks(5);
      tasks[2].selected = true; tasks[2].status = TaskState.SELECTED;
      tasks[0].selected = false; tasks[0].status = TaskState.VIEWING;
      const result = new TaskList(tasks).goToFirst();
      expect(result.selected?.id).toBe(1);
    });

    it('goes to last', () => {
      const result = new TaskList(makeTasks(5)).goToLast();
      expect(result.selected?.id).toBe(5);
    });
  });

  describe('search filtering', () => {
    it('filters by title', () => {
      const tasks = makeTasks(3);
      tasks[0].title = 'hello';
      tasks[1].title = 'world';
      tasks[2].title = 'hello world';
      const list = new TaskList(tasks, 'hello');
      expect(list.all).toHaveLength(2);
    });

    it('isSearching is true with filter', () => {
      const list = new TaskList(makeTasks(3), 'hello');
      expect(list.isSearching).toBe(true);
    });

    it('isSearching is false without filter', () => {
      expect(new TaskList(makeTasks(3)).isSearching).toBe(false);
    });
  });
});
