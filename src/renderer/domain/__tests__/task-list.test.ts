import { describe, it, expect } from 'vitest';
import { TaskList, taskMatchesSearch } from '../entities/task-list';
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

  describe('taskMatchesSearch', () => {
    it('matches title case-insensitively', () => {
      const tasks = makeTasks(3);
      tasks[0].title = 'Hello World';
      expect(taskMatchesSearch(tasks[0], 'hello')).toBe(true);
      expect(taskMatchesSearch(tasks[0], 'WORLD')).toBe(true);
    });

    it('matches content and tags', () => {
      const tasks = makeTasks(3);
      tasks[1].content = 'write report';
      tasks[2].tags = ['urgent', 'dev'];
      expect(taskMatchesSearch(tasks[1], 'report')).toBe(true);
      expect(taskMatchesSearch(tasks[2], 'URGENT')).toBe(true);
    });

    it('matches all when term is empty', () => {
      expect(taskMatchesSearch(makeTasks(1)[0], '')).toBe(true);
      expect(taskMatchesSearch(makeTasks(1)[0], undefined as unknown as string)).toBe(true);
    });
  });
});
