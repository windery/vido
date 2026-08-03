import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Store } from '../state/store';
import { Task, TaskState } from '../task';
import { TaskList } from '../entities/task-list';
import { TaskListManager } from '../manager/task-list-manager';
import { EditorMode } from '../editor';
import { logger } from '../../utils/logger';

describe('Store — 加载后默认选中', () => {
  it('init 加载后无选中任务时自动选中第一个', async () => {
    const mk = (id: number, title: string) => {
      const t = new Task(id);
      t.title = title;
      t.selected = false;
      t.status = TaskState.VIEWING;
      return t;
    };
    const loadSpy = vi.spyOn(TaskListManager, 'load').mockResolvedValue(
      new TaskListManager(new TaskList([mk(1, 'A'), mk(2, 'B')]), 3)
    );
    const store = new Store();
    await store.init();
    expect(store.manager.list.selected?.id).toBe(1);
    expect(store.state.selectedTaskId).toBe(1);
    loadSpy.mockRestore();
  });

  it('init 加载空列表时无选中但不出错', async () => {
    const loadSpy = vi.spyOn(TaskListManager, 'load').mockResolvedValue(
      new TaskListManager(new TaskList([]), 1)
    );
    const store = new Store();
    await store.init();
    expect(store.manager.list.selected).toBeNull();
    loadSpy.mockRestore();
  });
});

function makeStore(): Store {
  const store = new Store();
  const t = new Task(1);
  t.title = 'Test';
  t.content = 'line1\nline2';
  t.selected = true;
  t.status = TaskState.SELECTED;
  store.manager = new TaskListManager(new TaskList([t]), 2);
  return store;
}

describe('Store — 撤销 / 重做', () => {
  let store: Store;

  beforeEach(() => {
    store = makeStore();
  });

  it('createNewTask 后 undo 移除新任务', () => {
    const count = store.manager.list.items.length;
    store.createNewTask('New');
    expect(store.manager.list.items.length).toBe(count + 1);
    store.undo();
    expect(store.manager.list.items.length).toBe(count);
  });

  it('deleteSelectedTask 后 undo 恢复被删任务并重新选中', () => {
    const deleted = store.manager.list.selected!;
    store.deleteSelectedTask();
    expect(store.manager.list.items.find((t) => t.id === deleted.id)).toBeUndefined();
    store.undo();
    const restored = store.manager.list.items.find((t) => t.id === deleted.id);
    expect(restored).toBeDefined();
    expect(restored?.selected).toBe(true);
  });

  it('toggleTaskCompletion 后 undo 还原完成状态', () => {
    const task = store.manager.list.selected!;
    const before = task.completed;
    store.toggleTaskCompletion();
    expect(store.manager.list.selected?.completed).toBe(!before);
    store.undo();
    expect(store.manager.list.selected?.completed).toBe(before);
  });

  it('toggleFlag 后 undo 还原旗标状态', () => {
    const task = store.manager.list.selected!;
    const before = task.flagged;
    store.toggleFlag();
    expect(store.manager.list.selected?.flagged).toBe(!before);
    store.undo();
    expect(store.manager.list.selected?.flagged).toBe(before);
  });

  it('undo 后再 redo 重新应用操作', () => {
    const count = store.manager.list.items.length;
    store.createNewTask('Redo me');
    store.undo();
    expect(store.manager.list.items.length).toBe(count);
    store.redo();
    expect(store.manager.list.items.length).toBe(count + 1);
  });

  it('undo 后新操作清空重做分支', () => {
    const count = store.manager.list.items.length;
    store.createNewTask('A');
    store.undo();
    store.createNewTask('B');
    store.redo();
    // 重做分支已被清空：不应恢复 'A' 的创建
    expect(store.manager.list.items.length).toBe(count + 1);
    const titles = store.manager.list.items.map((t) => t.title);
    expect(titles).not.toContain('A');
  });
});

describe('Store — 搜索：n/N 跳转与清除', () => {
  function makeSearchStore(): Store {
    const store = new Store();
    const mk = (id: number, title: string) => {
      const t = new Task(id);
      t.title = title;
      t.selected = false;
      t.status = TaskState.VIEWING;
      return t;
    };
    const tasks = [mk(1, 'Alpha one'), mk(2, 'Beta'), mk(3, 'Alpha two'), mk(4, 'Gamma')];
    tasks[0].selected = true;
    tasks[0].status = TaskState.SELECTED;
    store.manager = new TaskListManager(new TaskList(tasks), 5);
    return store;
  }

  it('applySearch 将选中项移到第一个匹配任务', () => {
    const store = makeSearchStore();
    store.updateLastlineContent('/alpha');
    store.applySearch();
    expect(store.manager.list.selected?.id).toBe(1);
  });

  it('searchNext 跳到下一个匹配，循环回绕', () => {
    const store = makeSearchStore();
    store.updateLastlineContent('/alpha');
    store.applySearch();
    expect(store.manager.list.selected?.id).toBe(1);
    store.searchNext(1);
    expect(store.manager.list.selected?.id).toBe(3);
    store.searchNext(1);
    expect(store.manager.list.selected?.id).toBe(1); // 回绕
  });

  it('searchNext(-1) 跳到上一个匹配', () => {
    const store = makeSearchStore();
    store.updateLastlineContent('/alpha');
    store.searchNext(-1);
    expect(store.manager.list.selected?.id).toBe(3);
  });

  it('无匹配时 searchNext 不改变选中项', () => {
    const store = makeSearchStore();
    store.updateLastlineContent('/nonexistent');
    store.searchNext(1);
    expect(store.manager.list.selected?.id).toBe(1);
  });

  it('clearSearch 清空 / 搜索内容', () => {
    const store = makeSearchStore();
    store.updateLastlineContent('/alpha');
    store.clearSearch();
    expect(store.state.lastlineContent).toBe('');
  });
});

describe('Store — task.status 与 editorMode 保持同步', () => {
  let store: Store;

  beforeEach(() => {
    store = makeStore();
  });

  it('startContentNavigation 设置任务状态为 CONTENT_NAVIGATION', () => {
    store.startContentNavigation();
    expect(store.manager.list.selected?.status).toBe(TaskState.CONTENT_NAVIGATION);
  });

  it('startEditingAtCursor 设置任务状态为 CONTENT_EDITING', () => {
    store.startEditingAtCursor();
    expect(store.manager.list.selected?.status).toBe(TaskState.CONTENT_EDITING);
  });

  it('transition(i) 从 COMMAND 进入 CONTENT_NAVIGATION 并同步任务状态', () => {
    store.transition('i');
    expect(store.state.editorMode).toBe(EditorMode.CONTENT_NAVIGATION);
    expect(store.manager.list.selected?.status).toBe(TaskState.CONTENT_NAVIGATION);
  });

  it('transition(i) 后再 transition(Escape) 返回 COMMAND 并同步为 SELECTED', () => {
    store.transition('i');
    store.transition('Escape');
    expect(store.state.editorMode).toBe(EditorMode.COMMAND);
    expect(store.manager.list.selected?.status).toBe(TaskState.SELECTED);
  });

  it('CONTENT_NAVIGATION 中 transition(i) 进入 CONTENT_EDIT 并同步任务状态', () => {
    store.transition('i');
    store.transition('i');
    expect(store.state.editorMode).toBe(EditorMode.CONTENT_EDIT);
    expect(store.manager.list.selected?.status).toBe(TaskState.CONTENT_EDITING);
  });

  it('CONTENT_EDIT 中 transition(Escape) 返回 CONTENT_NAVIGATION 并同步任务状态', () => {
    store.transition('i');
    store.transition('i');
    store.transition('Escape');
    expect(store.state.editorMode).toBe(EditorMode.CONTENT_NAVIGATION);
    expect(store.manager.list.selected?.status).toBe(TaskState.CONTENT_NAVIGATION);
  });

  it('transition(/) 进入 LAST_LINE 并把触发符写入 lastlineContent', () => {
    store.transition('/');
    expect(store.state.editorMode).toBe(EditorMode.LAST_LINE);
    expect(store.state.lastlineContent).toBe('/');
    expect(store.state.lastlineVisible).toBe(true);
  });

  it('transition(:) 进入 LAST_LINE 并把触发符写入 lastlineContent', () => {
    store.transition(':');
    expect(store.state.editorMode).toBe(EditorMode.LAST_LINE);
    expect(store.state.lastlineContent).toBe(':');
    expect(store.state.lastlineVisible).toBe(true);
  });

  it('LAST_LINE 中 transition(Enter) 关闭 lastline 但保留搜索过滤', () => {
    store.transition('/');
    store.updateLastlineContent('/term');
    store.transition('Enter');
    expect(store.state.lastlineVisible).toBe(false);
    expect(store.state.lastlineContent).toBe('/term');
  });
});

describe('Store — 数据变更日志', () => {
  let store: Store;

  beforeEach(() => {
    store = makeStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function storeInfoCalls(spy: ReturnType<typeof vi.spyOn>): any[][] {
    return spy.mock.calls.filter((c: any[]) => c[0] === 'Store');
  }

  it('createNewTask 记录一条 [Store] create task，含 id/title', () => {
    const spy = vi.spyOn(logger, 'info');
    store.createNewTask('New Task');
    const calls = storeInfoCalls(spy);
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe('create task');
    expect(calls[0][2]).toEqual(
      expect.objectContaining({ id: expect.any(Number), title: 'New Task' })
    );
  });

  it('deleteSelectedTask 记录 [Store] delete task，含被删任务 id/title', () => {
    const spy = vi.spyOn(logger, 'info');
    const deleted = store.manager.list.selected!;
    store.deleteSelectedTask();
    const calls = storeInfoCalls(spy);
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe('delete task');
    expect(calls[0][2]).toEqual(
      expect.objectContaining({ id: deleted.id, title: deleted.title })
    );
  });

  it('toggleTaskCompletion 记录 [Store] toggle complete，含变更后 completed', () => {
    const spy = vi.spyOn(logger, 'info');
    const task = store.manager.list.selected!;
    store.toggleTaskCompletion();
    const calls = storeInfoCalls(spy);
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe('toggle complete');
    expect(calls[0][2]).toEqual(
      expect.objectContaining({ id: task.id, completed: !task.completed })
    );
  });

  it('toggleFlag 记录 [Store] toggle flag，含变更后 flagged', () => {
    const spy = vi.spyOn(logger, 'info');
    const task = store.manager.list.selected!;
    store.toggleFlag();
    const calls = storeInfoCalls(spy);
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe('toggle flag');
    expect(calls[0][2]).toEqual(
      expect.objectContaining({ id: task.id, flagged: !task.flagged })
    );
  });

  it('updateTaskProperty 记录 [Store] update task，含 id/field/value', () => {
    const spy = vi.spyOn(logger, 'info');
    const task = store.manager.list.selected!;
    store.updateTaskProperty(task.id, 'priority', 'high');
    const calls = storeInfoCalls(spy);
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe('update task');
    expect(calls[0][2]).toEqual(
      expect.objectContaining({ id: task.id, field: 'priority', value: 'high' })
    );
  });

  it('pasteTask 记录 [Store] paste task，含 newId/fromId', () => {
    const spy = vi.spyOn(logger, 'info');
    const source = store.manager.list.selected!;
    store.copySelectedTask();
    store.pasteTask();
    const calls = storeInfoCalls(spy);
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe('paste task');
    expect(calls[0][2]).toEqual(
      expect.objectContaining({ newId: expect.any(Number), fromId: source.id })
    );
  });

  it('sortTasks 记录 [Store] sort tasks，含 type/count', () => {
    const spy = vi.spyOn(logger, 'info');
    store.sortTasks('title');
    const calls = storeInfoCalls(spy);
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe('sort tasks');
    expect(calls[0][2]).toEqual(
      expect.objectContaining({ type: 'title', count: expect.any(Number) })
    );
  });

  it('insertNewLineBelow 记录 [Store] insert line，含 taskId/line', () => {
    const spy = vi.spyOn(logger, 'info');
    const task = store.manager.list.selected!;
    store.insertNewLineBelow();
    const calls = storeInfoCalls(spy);
    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe('insert line');
    expect(calls[0][2]).toEqual(
      expect.objectContaining({ taskId: task.id, line: expect.any(Number) })
    );
  });

  it('undo 记录 [Store] undo，含 step/total/tasks', () => {
    const spy = vi.spyOn(logger, 'info');
    store.createNewTask('Temp');
    store.undo();
    const undoCall = storeInfoCalls(spy).find((c) => c[1] === 'undo');
    expect(undoCall).toBeDefined();
    expect(undoCall![2]).toEqual(
      expect.objectContaining({
        step: expect.any(Number),
        total: expect.any(Number),
        tasks: expect.any(Array),
      })
    );
  });

  it('redo 记录 [Store] redo，含 step/total/tasks', () => {
    const spy = vi.spyOn(logger, 'info');
    store.createNewTask('Temp');
    store.undo();
    store.redo();
    const redoCall = storeInfoCalls(spy).find((c) => c[1] === 'redo');
    expect(redoCall).toBeDefined();
    expect(redoCall![2]).toEqual(
      expect.objectContaining({
        step: expect.any(Number),
        total: expect.any(Number),
        tasks: expect.any(Array),
      })
    );
  });

  it('applySearch 记录 [Store] search，含 term/matches/selectedId', () => {
    const spy = vi.spyOn(logger, 'info');
    store.updateLastlineContent('/test');
    store.applySearch();
    const searchCall = storeInfoCalls(spy).find((c) => c[1] === 'search');
    expect(searchCall).toBeDefined();
    expect(searchCall![2]).toEqual(
      expect.objectContaining({
        term: 'test',
        matches: expect.any(Number),
        selectedId: expect.any(Number),
      })
    );
  });

  it('clearSearch 记录 [Store] clear search（无 data）', () => {
    const spy = vi.spyOn(logger, 'info');
    store.updateLastlineContent('/test');
    store.clearSearch();
    const clearCall = storeInfoCalls(spy).find((c) => c[1] === 'clear search');
    expect(clearCall).toBeDefined();
    expect(clearCall![2]).toBeUndefined();
  });

  it('非变更操作 selectTask/selectNext/goToFirst 不产生 [Store] 数据变更日志', () => {
    const spy = vi.spyOn(logger, 'info');
    store.selectTask(1);
    store.selectNext();
    store.goToFirst();
    expect(storeInfoCalls(spy)).toHaveLength(0);
  });
});

describe('Store — :sort updated 基于 updatedAt', () => {
  function makeUpdatedStore(): Store {
    const store = new Store();
    const mk = (id: number, title: string, updatedAt?: number) => {
      const t = new Task(id);
      t.title = title;
      t.updatedAt = updatedAt;
      t.selected = false;
      t.status = TaskState.VIEWING;
      return t;
    };
    store.manager = new TaskListManager(
      new TaskList([
        mk(1, 'A', 1000),
        mk(2, 'B', 3000),
        mk(3, 'C', 2000),
        mk(4, 'D'),
      ]),
      5
    );
    return store;
  }

  it('updated 排序把最近更新的排最前', () => {
    const store = makeUpdatedStore();
    store.sortTasks('updated');
    const titles = store.manager.list.items.map((t) => t.title);
    expect(titles[0]).toBe('B'); // updatedAt 3000 最新
    expect(titles[1]).toBe('C'); // 2000
    expect(titles[2]).toBe('A'); // 1000
    expect(titles[3]).toBe('D'); // 无 updatedAt，回退 id 最小 → 最后
  });

  it('数据属性变更刷新 updatedAt，UI 状态变更不刷新', () => {
    const store = makeUpdatedStore();
    const t = store.manager.list.items[0]; // A
    store.updateTaskProperty(t.id, 'title', 'A-改');
    const t1 = store.manager.list.items.find((x) => x.id === t.id)!;
    expect(t1.updatedAt).toBeGreaterThan(3000);
    store.updateTaskProperty(t.id, 'status', 0);
    const t2 = store.manager.list.items.find((x) => x.id === t.id)!;
    expect(t2.updatedAt).toBe(t1.updatedAt); // UI 状态不改变 updatedAt
  });
});

describe('Store — 防抖自动保存', () => {
  let store: Store;

  beforeEach(() => {
    store = makeStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('数据变更后防抖 800ms 自动保存', () => {
    vi.useFakeTimers();
    const saveSpy = vi.spyOn(store.manager, 'save').mockResolvedValue(undefined);
    store.createNewTask('Auto');
    expect(saveSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(799);
    expect(saveSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('连续数据变更合并为一次保存', () => {
    vi.useFakeTimers();
    const saveSpy = vi.spyOn(store.manager, 'save').mockResolvedValue(undefined);
    store.createNewTask('A');
    vi.advanceTimersByTime(500);
    store.toggleTaskCompletion();
    vi.advanceTimersByTime(500);
    expect(saveSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('updateTaskProperty 与 undo 各自触发一次保存', () => {
    vi.useFakeTimers();
    const saveSpy = vi.spyOn(store.manager, 'save').mockResolvedValue(undefined);
    const task = store.manager.list.selected!;
    store.updateTaskProperty(task.id, 'priority', 'HIGH');
    vi.advanceTimersByTime(800);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    store.toggleTaskCompletion();
    vi.advanceTimersByTime(800);
    expect(saveSpy).toHaveBeenCalledTimes(2);
    store.undo();
    vi.advanceTimersByTime(800);
    expect(saveSpy).toHaveBeenCalledTimes(3);
  });
});
