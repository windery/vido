import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Store } from '../state/store';
import { Task, TaskState } from '../task';
import { TaskList } from '../entities/task-list';
import { TaskListManager } from '../manager/task-list-manager';
import { EditorMode } from '../editor';
import { logger } from '../../utils/logger';
import { createTodaySchedule, createSpecificDateTimeSchedule } from '../../utils/schedule-helper';
import { getCurrentDate, formatDate } from '../../utils/date-formatter';

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

  it('updateTaskProperty 后 undo 还原字段（标题/内容/优先级等数据属性）', () => {
    const task = store.manager.list.selected!;
    const beforeTitle = task.title;
    store.updateTaskProperty(task.id, 'title', '改过的标题');
    expect(store.manager.list.selected?.title).toBe('改过的标题');
    store.undo();
    expect(store.manager.list.selected?.title).toBe(beforeTitle);
  });

  it('内容编辑（updateTaskProperty content）可 undo 还原', () => {
    const task = store.manager.list.selected!;
    store.updateTaskProperty(task.id, 'content', 'line1\nline2\nline3');
    expect(store.manager.list.selected?.content).toBe('line1\nline2\nline3');
    store.undo();
    expect(store.manager.list.selected?.content).toBe('line1\nline2');
  });

  it('一次内容编辑会话内的连续输入合并为一条撤销记录（一次 u 还原整段编辑）', () => {
    const task = store.manager.list.selected!;
    const orig = task.content;
    store.transition('i');
    store.transition('i');
    store.updateTaskProperty(task.id, 'content', orig + '\n- 第一行');
    store.updateTaskProperty(task.id, 'content', orig + '\n- 第一行\n- 第二行');
    store.updateTaskProperty(task.id, 'content', orig + '\n- 第一行\n- 第二行\n- 第三行');
    store.undo();
    expect(store.manager.list.selected?.content).toBe(orig);
  });

  it('undo 内容编辑后任务 status 归一化回 SELECTED（不卡在编辑态）', () => {
    const task = store.manager.list.selected!;
    store.transition('i');
    store.transition('i');
    store.updateTaskProperty(task.id, 'content', '# 新内容');
    expect(store.manager.list.selected?.status).toBe(TaskState.CONTENT_EDITING);
    store.undo();
    expect(store.manager.list.selected?.content).toBe('line1\nline2');
    expect(store.manager.list.selected?.status).toBe(TaskState.SELECTED);
  });

  it('退出再进入的不同编辑会话各自独立成一条撤销记录', () => {
    const task = store.manager.list.selected!;
    const orig = task.content;
    // 会话 1
    store.transition('i');
    store.transition('i');
    store.updateTaskProperty(task.id, 'content', orig + '\n- A');
    store.exitContentNavigation();
    // 会话 2（重新进入编辑态，开新会话）
    store.transition('i');
    store.transition('i');
    store.updateTaskProperty(task.id, 'content', orig + '\n- B');
    store.undo();
    expect(store.manager.list.selected?.content).toBe(orig + '\n- A');
    store.undo();
    expect(store.manager.list.selected?.content).toBe(orig);
  });

  it('undo/redo 后保留 Schedule 类原型（getDisplayText 可调用）', () => {
    const task = store.manager.list.selected!;
    task.schedule = createTodaySchedule();
    expect(typeof task.schedule!.getDisplayText).toBe('function');
    store.toggleTaskCompletion();
    store.undo();
    const afterUndo = store.manager.list.selected!;
    expect(afterUndo.schedule).toBeDefined();
    expect(typeof afterUndo.schedule!.getDisplayText).toBe('function');
    expect(typeof afterUndo.schedule!.getDisplayText()).toBe('string');
    store.redo();
    const afterRedo = store.manager.list.selected!;
    expect(typeof afterRedo.schedule!.getDisplayText).toBe('function');
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

describe('Store — 命令历史', () => {
  function makeHistoryStore(): Store {
    const store = new Store();
    const t = new Task(1);
    t.title = 'Test';
    t.selected = true;
    t.status = TaskState.SELECTED;
    store.manager = new TaskListManager(new TaskList([t]), 2);
    return store;
  }

  it('pushLastlineHistory 压入命令，连续相同内容去重', () => {
    const store = makeHistoryStore();
    store.pushLastlineHistory(':sort title');
    store.pushLastlineHistory(':sort title');
    store.pushLastlineHistory(':p 1');
    expect(store.getLastlineHistory()).toEqual([':sort title', ':p 1']);
  });

  it('pushLastlineHistory 忽略空白内容', () => {
    const store = makeHistoryStore();
    store.pushLastlineHistory('   ');
    store.pushLastlineHistory('');
    expect(store.getLastlineHistory()).toEqual([]);
  });

  it('pushLastlineHistory 上限 50 条，超限丢弃最旧', () => {
    const store = makeHistoryStore();
    for (let i = 0; i < 60; i++) store.pushLastlineHistory(`:cmd${i}`);
    const h = store.getLastlineHistory();
    expect(h.length).toBe(50);
    expect(h[0]).toBe(':cmd10');
    expect(h[49]).toBe(':cmd59');
  });

  it('getLastlineHistory 返回副本，外部修改不影响内部历史', () => {
    const store = makeHistoryStore();
    store.pushLastlineHistory(':w');
    const h = store.getLastlineHistory();
    h.push(':恶意命令');
    expect(store.getLastlineHistory()).toEqual([':w']);
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

describe('Store — 配置面板跟随选中任务（j/k 移动时 configState 迁移）', () => {
  function makeMultiStore(): Store {
    const store = new Store();
    const mk = (id: number, title: string) => {
      const t = new Task(id);
      t.title = title;
      t.selected = false;
      t.status = TaskState.VIEWING;
      return t;
    };
    store.manager = new TaskListManager(new TaskList([mk(1, 'A'), mk(2, 'B'), mk(3, 'C')]), 4);
    store.manager.selectTask(1);
    return store;
  }

  it('配置展开时 selectNext 把 configState 迁移到新选中任务', () => {
    const store = makeMultiStore();
    store.setConfigState(1, 'schedule-select');
    store.selectNext();
    const selected = store.manager.list.selected!;
    expect(selected.id).toBe(2);
    expect(selected.configState).toBe('schedule-select');
    expect(store.manager.list.items.find((t) => t.id === 1)!.configState).toBeUndefined();
  });

  it('selectPrevious 反向迁移同样生效', () => {
    const store = makeMultiStore();
    store.manager.selectTask(3);
    store.setConfigState(3, 'tags-select');
    store.selectPrevious();
    const selected = store.manager.list.selected!;
    expect(selected.id).toBe(2);
    expect(selected.configState).toBe('tags-select');
    expect(store.manager.list.items.find((t) => t.id === 3)!.configState).toBeUndefined();
  });

  it('未展开配置时移动任务不受影响', () => {
    const store = makeMultiStore();
    store.selectNext();
    expect(store.manager.list.selected!.configState).toBeUndefined();
  });
});

describe('Store — 搜索激活时 j/k 只在匹配集内移动', () => {
  function makeSearchStore(): Store {
    const store = new Store();
    const mk = (id: number, title: string) => {
      const t = new Task(id);
      t.title = title;
      t.selected = false;
      t.status = TaskState.VIEWING;
      return t;
    };
    store.manager = new TaskListManager(new TaskList([
      mk(1, 'apple'),
      mk(2, 'banana'),
      mk(3, 'apple pie'),
      mk(4, 'cherry'),
    ]), 5);
    store.manager.selectTask(1);
    return store;
  }

  it('搜索 /apple 时 selectNext 只在匹配集（1,3）内移动', () => {
    const store = makeSearchStore();
    store.updateLastlineContent('/apple');
    store.selectNext(); // 1 → 3（跳过 banana）
    expect(store.manager.list.selected?.id).toBe(3);
    store.selectNext(); // 3 → 1（回卷）
    expect(store.manager.list.selected?.id).toBe(1);
  });

  it('搜索 /apple 时 selectPrevious 反向移动', () => {
    const store = makeSearchStore();
    store.updateLastlineContent('/apple');
    store.manager.selectTask(3);
    store.selectPrevious(); // 3 → 1
    expect(store.manager.list.selected?.id).toBe(1);
  });

  it('搜索激活时移动不会落到不可见任务', () => {
    const store = makeSearchStore();
    store.updateLastlineContent('/apple');
    store.selectNext();
    const id = store.manager.list.selected!.id;
    expect([1, 3]).toContain(id);
  });
});

describe('Store — content-nav 模式 dd 删除当前行', () => {
  function makeContentStore(): Store {
    const store = new Store();
    const t = new Task(1);
    t.title = 'A';
    t.selected = true;
    t.status = TaskState.SELECTED;
    t.content = 'line1\nline2\nline3';
    store.manager = new TaskListManager(new TaskList([t]), 2);
    store.transition('i'); // COMMAND → CONTENT_NAVIGATION
    return store;
  }

  it('dd 删除光标所在行，光标落在下一行行首', () => {
    const store = makeContentStore();
    store.moveCursorDown(); // 光标到第 2 行
    store.deleteLineAtCursor();
    const task = store.manager.list.selected!;
    expect(task.content).toBe('line1\nline3');
    expect(task.cursorLine).toBe(1);
    expect(task.status).toBe(TaskState.CONTENT_NAVIGATION); // 不退出导航
  });

  it('删除最后一行时光标落在新的最后一行', () => {
    const store = makeContentStore();
    store.moveCursorDown();
    store.moveCursorDown(); // 光标到最后一行（第 3 行）
    store.deleteLineAtCursor();
    const task = store.manager.list.selected!;
    expect(task.content).toBe('line1\nline2');
    expect(task.cursorLine).toBe(1);
  });

  it('dd 可撤销恢复被删行', () => {
    const store = makeContentStore();
    store.deleteLineAtCursor();
    expect(store.manager.list.selected!.content).toBe('line2\nline3');
    store.undo();
    expect(store.manager.list.selected!.content).toBe('line1\nline2\nline3');
  });

  it('单行内容删除后为空串，光标仍有效', () => {
    const store = makeContentStore();
    store.manager.list.selected!.content = 'only';
    store.deleteLineAtCursor();
    const task = store.manager.list.selected!;
    expect(task.content).toBe('');
    expect(task.cursorLine).toBe(0);
  });
});

describe('Store — content-nav vim 编辑操作', () => {
  function makeNavStore(content: string): Store {
    const store = new Store();
    const t = new Task(1);
    t.title = 'A';
    t.selected = true;
    t.status = TaskState.SELECTED;
    t.content = content;
    store.manager = new TaskListManager(new TaskList([t]), 2);
    store.transition('i'); // → CONTENT_NAVIGATION
    return store;
  }
  const cur = (s: Store) => s.manager.list.selected!;

  it('x 删除光标处字符', () => {
    const s = makeNavStore('hello world');
    s.moveCursorRight(); // 光标 col=1
    s.deleteCharAtCursor();
    expect(cur(s).content).toBe('hllo world');
    expect(cur(s).cursorColumn).toBe(1);
  });

  it('x 在行尾连接下一行', () => {
    const s = makeNavStore('foo\nbar');
    s.moveCursorToLineEnd();
    s.deleteCharAtCursor();
    expect(cur(s).content).toBe('foobar');
  });

  it('X 删除前一字符；行首连接上一行', () => {
    const s = makeNavStore('foo\nbar');
    s.moveCursorDown(); // 到第 2 行，col=0 行首
    s.deleteCharBeforeCursor(); // 连接上一行
    expect(cur(s).content).toBe('foobar');
    expect(cur(s).cursorLine).toBe(0);
    expect(cur(s).cursorColumn).toBe(3);
  });

  it('dw 删到下一词首', () => {
    const s = makeNavStore('one two three');
    s.deleteWordForward();
    expect(cur(s).content).toBe('two three');
  });

  it('de 删到当前词尾', () => {
    const s = makeNavStore('hello world');
    s.deleteWordEnd();
    expect(cur(s).content).toBe(' world');
  });

  it('db 删到词首', () => {
    const s = makeNavStore('hello world');
    s.moveCursorToLineEnd(); // col=11
    s.deleteWordBackward();
    expect(cur(s).content).toBe('hello ');
  });

  it('d$ 删到行尾', () => {
    const s = makeNavStore('hello world');
    s.moveCursorToLineStart();
    s.moveCursorRight(); s.moveCursorRight(); // col=2
    s.deleteToLineEnd();
    expect(cur(s).content).toBe('he');
  });

  it('d0 删到行首', () => {
    const s = makeNavStore('hello');
    s.moveCursorToLineEnd();
    s.deleteToLineStart();
    expect(cur(s).content).toBe(''); // col=5 删 [0,5) 整行
  });

  it('dgg 删第 1 行到光标行', () => {
    const s = makeNavStore('a\nb\nc');
    s.moveCursorDown(); s.moveCursorDown(); // 第 3 行
    s.deleteToFirstLine();
    expect(cur(s).content).toBe('c');
    expect(cur(s).cursorLine).toBe(0);
  });

  it('dG 删光标行到末行', () => {
    const s = makeNavStore('a\nb\nc');
    s.deleteToLastLine(); // 第 1 行开始删
    expect(cur(s).content).toBe('');
  });

  it('J 合并下一行（加空格）', () => {
    const s = makeNavStore('foo\nbar');
    s.mergeLineBelow();
    expect(cur(s).content).toBe('foo bar');
    expect(cur(s).cursorLine).toBe(0);
  });

  it('r 替换光标处字符', () => {
    const s = makeNavStore('abc');
    s.replaceCharAtCursor('Z');
    expect(cur(s).content).toBe('Zbc');
    expect(cur(s).cursorColumn).toBe(1);
  });

  it('~ 切换大小写', () => {
    const s = makeNavStore('ab');
    s.swapCaseAtCursor();
    expect(cur(s).content).toBe('Ab');
    expect(cur(s).cursorColumn).toBe(1);
  });

  it('yy + p 复制整行并粘贴到下方', () => {
    const s = makeNavStore('a\nb');
    s.moveCursorDown(); // 到第 2 行 'b'
    s.copyLine();
    s.pasteAfter();
    expect(cur(s).content).toBe('a\nb\nb');
    expect(cur(s).cursorLine).toBe(2);
  });

  it('yw + p 复制词并在光标后粘贴', () => {
    const s = makeNavStore('ab cd');
    s.copyWord(); // 复制 'ab'
    s.moveCursorWordForward(); // 光标到 'cd' 开头 col=3
    s.pasteAfter(); // 在 col=3 后插入 ab
    expect(cur(s).content).toBe('ab abcd');
  });

  it('u 撤销编辑操作', () => {
    const s = makeNavStore('hello');
    s.moveCursorToLineEnd();
    s.deleteToLineStart();
    expect(cur(s).content).toBe(''); // col=5 删 [0,5) 整行
    s.undo();
    expect(cur(s).content).toBe('hello');
  });

  it('O 上方插入空行', () => {
    const s = makeNavStore('a\nb');
    s.moveCursorDown();
    s.insertLineAbove();
    expect(cur(s).content).toBe('a\n\nb');
    expect(cur(s).cursorLine).toBe(1);
  });
});

describe('Store — Ctrl+V 可视块模式', () => {
  function makeNavStore(content: string): Store {
    const store = new Store();
    const t = new Task(1);
    t.title = 'A';
    t.selected = true;
    t.status = TaskState.SELECTED;
    t.content = content;
    store.manager = new TaskListManager(new TaskList([t]), 2);
    store.transition('i'); // → CONTENT_NAVIGATION
    return store;
  }
  const cur = (s: Store) => s.manager.list.selected!;

  it('进入块模式：锚点=当前光标', () => {
    const s = makeNavStore('ab\ncd');
    s.moveCursorRight(); // col=1
    s.startVisualBlock();
    expect(s.state.visualBlock.active).toBe(true);
    expect(s.state.visualBlock.anchorLine).toBe(0);
    expect(s.state.visualBlock.anchorCol).toBe(1);
  });

  it('x 删除矩形块：内容删除、yank 入缓冲、光标落左上角、退出块模式', () => {
    const s = makeNavStore('abcd\nefgh\nijkl');
    s.moveCursorRight(); // (0,1)
    s.startVisualBlock(); // 锚点 (0,1)
    s.moveCursorDown(); // (1,1)
    s.moveCursorDown(); // (2,1)
    s.moveCursorRight(); // (2,2) → 块 = 行 0..2 × 列 1..2
    s.deleteVisualBlock();
    expect(cur(s).content).toBe('ad\neh\nil');
    expect(s.state.visualBlock.active).toBe(false);
    expect(cur(s).cursorLine).toBe(0);
    expect(cur(s).cursorColumn).toBe(1);

    // 删除的块 'bc\nfg\njk' 入内部缓冲，p 可粘贴
    s.pasteAfter();
    expect(cur(s).content).toBe('ad\nbc\nfg\njk\neh\nil');
  });

  it('y 复制块不删除，退出块模式', () => {
    const s = makeNavStore('abcd\nefgh');
    s.moveCursorRight(); // (0,1)
    s.startVisualBlock(); // 锚点 (0,1)
    s.moveCursorDown(); // (1,1)
    s.moveCursorRight(); // (1,2) → 块 = 行 0..1 × 列 1..2
    s.copyVisualBlock();
    expect(cur(s).content).toBe('abcd\nefgh');
    expect(s.state.visualBlock.active).toBe(false);

    s.moveCursorToLastLine();
    s.pasteAfter();
    expect(cur(s).content).toBe('abcd\nefgh\nbc\nfg');
  });

  it('短行不足块起列：该行不删字符', () => {
    const s = makeNavStore('abcd\nx');
    s.startVisualBlock(); // 锚点 (0,0)
    s.moveCursorDown(); // (1,0)
    s.moveCursorRight(); // (1,1) → 块 = 行 0..1 × 列 0..1
    s.deleteVisualBlock();
    expect(cur(s).content).toBe('cd\n');
  });

  it('Esc（transition）退出导航时清理块选区', () => {
    const s = makeNavStore('ab');
    s.startVisualBlock();
    expect(s.state.visualBlock.active).toBe(true);
    s.transition('Escape');
    expect(s.state.visualBlock.active).toBe(false);
  });
});

describe('Store — p/P 系统文本粘贴（字符式）', () => {
  function makeNavStore(content: string): Store {
    const store = new Store();
    const t = new Task(1);
    t.title = 'A';
    t.selected = true;
    t.status = TaskState.SELECTED;
    t.content = content;
    store.manager = new TaskListManager(new TaskList([t]), 2);
    store.transition('i'); // → CONTENT_NAVIGATION
    return store;
  }
  const cur = (s: Store) => s.manager.list.selected!;

  it('单行文本：光标处插入，p 光标落粘贴末尾', () => {
    const s = makeNavStore('ab cd');
    s.moveCursorWordForward(); // col=3（'c' 前）
    s.pasteTextRaw('XX', false);
    expect(cur(s).content).toBe('ab XXcd');
    expect(cur(s).cursorColumn).toBe(5); // 粘贴内容末尾
  });

  it('P 光标落粘贴内容开头', () => {
    const s = makeNavStore('ab cd');
    s.moveCursorWordForward(); // col=3
    s.pasteTextRaw('XY', true);
    expect(cur(s).content).toBe('ab XYcd');
    expect(cur(s).cursorColumn).toBe(3); // 粘贴内容开头
  });

  it('多行文本：当前行切行插入，p 光标落末段末尾', () => {
    const s = makeNavStore('ab cd');
    s.moveCursorWordForward(); // col=3
    s.pasteTextRaw('L1\nL2', false);
    expect(cur(s).content).toBe('ab L1\nL2cd');
    expect(cur(s).cursorLine).toBe(1);
    expect(cur(s).cursorColumn).toBe(2);
  });

  it('空文本不改变内容', () => {
    const s = makeNavStore('ab');
    s.pasteTextRaw('', false);
    expect(cur(s).content).toBe('ab');
  });
});

describe('Store — content-nav undo 保持导航态（块光标不消失）', () => {
  function makeNavStore(content: string): Store {
    const store = new Store();
    const t = new Task(1);
    t.title = 'A';
    t.selected = true;
    t.status = TaskState.SELECTED;
    t.content = content;
    store.manager = new TaskListManager(new TaskList([t]), 2);
    store.transition('i'); // → CONTENT_NAVIGATION
    return store;
  }
  const cur = (s: Store) => s.manager.list.selected!;

  it('dd 后 u：内容与光标恢复，且仍在 content-nav（块光标渲染依赖此状态）', () => {
    const s = makeNavStore('a\nb');
    s.moveCursorDown(); // 光标第 2 行
    s.deleteLineAtCursor(); // dd
    expect(cur(s).content).toBe('a');
    s.undo();
    expect(cur(s).content).toBe('a\nb');
    expect(cur(s).status).toBe(TaskState.CONTENT_NAVIGATION); // 关键：光标可见
    expect(cur(s).cursorLine).toBe(1); // 光标回到删除前的位置
  });

  it('x 后 u：内容恢复且仍在 content-nav', () => {
    const s = makeNavStore('hello');
    s.moveCursorRight();
    s.deleteCharAtCursor();
    expect(cur(s).content).toBe('hllo');
    s.undo();
    expect(cur(s).content).toBe('hello');
    expect(cur(s).status).toBe(TaskState.CONTENT_NAVIGATION);
    expect(cur(s).cursorColumn).toBe(1);
  });

  it('非导航态 undo：恢复后归位 SELECTED（keepNav 不误判）', () => {
    const s = makeNavStore('abc');
    s.transition('Escape'); // nav → COMMAND，status 归位 SELECTED
    expect(cur(s).status).toBe(TaskState.SELECTED);
    const oldTitle = cur(s).title;
    s.updateTaskProperty(cur(s).id, 'title', 'new title');
    s.undo();
    expect(cur(s).title).toBe(oldTitle);
    expect(cur(s).status).toBe(TaskState.SELECTED); // 不卡编辑态、不误判导航态
  });
});

describe('Store — 子任务缩进（tab / Shift+Tab）', () => {
  function makeStore(): Store {
    const store = new Store();
    const tasks = [new Task(1), new Task(2), new Task(3)];
    tasks.forEach((t, i) => { t.title = `T${i + 1}`; t.selected = i === 1; });
    store.manager = new TaskListManager(new TaskList(tasks), 4);
    return store;
  }
  const cur = (s: Store) => s.manager.list.selected!;

  it('tab：选中任务缩进为上一个任务的子任务（indent = 上一个 indent+1）', () => {
    const s = makeStore(); // 选中 T2，前一个 T1.indent=0
    s.indentSelectedTask();
    expect(cur(s).indent).toBe(1);
  });

  it('tab 幂等且子任务最多 1 级', () => {
    const s = makeStore();
    s.indentSelectedTask(); // T2 → 1（T1 的子级）
    s.indentSelectedTask(); // 再按还是 1（幂等）
    expect(cur(s).indent).toBe(1);
    // T3：上一个 T2 是子任务 → 与 T2 同父（T1）缩进为子任务 → 1
    s.manager.list = s.manager.list.selectTask(3);
    s.indentSelectedTask();
    expect(cur(s).indent).toBe(1);
    s.indentSelectedTask(); // 幂等，不产生 2 级
    expect(cur(s).indent).toBe(1);
    // 取消缩进后恢复顶级，再缩进仍生效
    s.unindentSelectedTask(); // T3 → 0
    expect(cur(s).indent).toBe(0);
    s.indentSelectedTask(); // 上一个 T2 indent=1 → 同父缩进 → 1
    expect(cur(s).indent).toBe(1);
  });

  it('第一个任务无法缩进', () => {
    const s = makeStore();
    s.manager.list = s.manager.list.selectTask(1);
    s.indentSelectedTask();
    expect(cur(s).indent).toBe(0);
  });

  it('Shift+Tab：取消缩进（indent-1，最低 0）', () => {
    const s = makeStore();
    s.indentSelectedTask(); // 1
    s.unindentSelectedTask(); // 0
    expect(cur(s).indent).toBe(0);
    s.unindentSelectedTask(); // 已在 0，不变
    expect(cur(s).indent).toBe(0);
  });

  it('缩进可撤销（u）', () => {
    const s = makeStore();
    s.indentSelectedTask();
    expect(cur(s).indent).toBe(1);
    s.undo();
    expect(cur(s).indent).toBe(0);
  });
});

describe('Store — 取消缩进不破坏兄弟归属（严重 bug 回归）', () => {
  it('T2 取消缩进后，后续兄弟子任务 T3 跟随取消（不挂在 T2 名下）', () => {
    const store = new Store();
    const tasks = [new Task(1), new Task(2), new Task(3)];
    tasks[0].title = 'T1';
    tasks[1].title = 'T2';
    tasks[2].title = 'T3';
    tasks[0].indent = 0;
    tasks[1].indent = 1; // T1 的子任务
    tasks[2].indent = 1; // 与 T2 同属 T1
    tasks[1].selected = true;
    store.manager = new TaskListManager(new TaskList(tasks), 4);
    store.unindentSelectedTask(); // 取消 T2
    const items = store.manager.list.items;
    expect(items[1].indent).toBe(0);
    expect(items[2].indent).toBe(0); // T3 跟随取消，不会变成 T2 的子任务
  });

  it('只有单个子任务：取消后无跟随对象', () => {
    const store = new Store();
    const tasks = [new Task(1), new Task(2)];
    tasks[0].indent = 0;
    tasks[1].indent = 1;
    tasks[1].selected = true;
    store.manager = new TaskListManager(new TaskList(tasks), 3);
    store.unindentSelectedTask();
    expect(store.manager.list.items[1].indent).toBe(0);
  });

  it('取消中间子任务：其后的兄弟全部跟随，不留下挂错父的任务', () => {
    const store = new Store();
    const tasks = [new Task(1), new Task(2), new Task(3), new Task(4), new Task(5)];
    [0, 1, 1, 1, 0].forEach((indent, i) => { tasks[i].indent = indent; });
    tasks[1].selected = true; // T2 是第一个子任务
    store.manager = new TaskListManager(new TaskList(tasks), 6);
    store.unindentSelectedTask();
    const items = store.manager.list.items;
    expect(items[1].indent).toBe(0);
    expect(items[2].indent).toBe(0);
    expect(items[3].indent).toBe(0);
    expect(items[4].indent).toBe(0); // 下一组顶级任务不受影响（本来就 0）
  });
});

describe('Store — schedule repeat（ed/ew/em/ey、cd/cw/cm/cy）', () => {
  function makeStore(): Store {
    const store = new Store();
    const t = new Task(1);
    t.title = 'T';
    t.selected = true;
    store.manager = new TaskListManager(new TaskList([t]), 2);
    return store;
  }
  const cur = (s: Store) => s.manager.list.selected!;

  it('无日程时 ed：创建今天日程 + daily repeat', () => {
    const s = makeStore();
    s.setScheduleRepeat(1, 'daily');
    expect(cur(s).schedule?.repeat).toBe('daily');
    expect(cur(s).schedule?.getShortText()).toContain(getCurrentDate());
  });

  it('已有日程时 ew：保留日期类型，repeat 更新为 weekly', () => {
    const s = makeStore();
    s.updateTaskProperty(1, 'schedule', createSpecificDateTimeSchedule('2026-05-08 10:00:00'));
    s.setScheduleRepeat(1, 'weekly');
    expect(cur(s).schedule?.repeat).toBe('weekly');
    expect(cur(s).schedule?.getDisplayText()).toContain('2026-05-08'); // 日期保留
  });

  it('cd 清除 daily（匹配才清）', () => {
    const s = makeStore();
    s.setScheduleRepeat(1, 'daily');
    s.setScheduleRepeat(1, undefined);
    expect(cur(s).schedule?.repeat).toBeUndefined();
    expect(cur(s).schedule).toBeDefined(); // 日程本身保留
  });

  it('repeat 可撤销（u）', () => {
    const s = makeStore();
    s.setScheduleRepeat(1, 'yearly');
    expect(cur(s).schedule?.repeat).toBe('yearly');
    s.undo();
    expect(cur(s).schedule).toBeUndefined();
  });
});

describe('Store — 日期视图（g c / H L / [ ]）', () => {
  function makeStore(): Store {
    const store = new Store();
    const t = new Task(1);
    t.title = 'T';
    t.selected = true;
    store.manager = new TaskListManager(new TaskList([t]), 2);
    return store;
  }
  const cv = (s: Store) => s.state.calendarView;
  it('openCalendarView：默认月粒度 + 今天锚点', () => {
    const s = makeStore();
    s.openCalendarView();
    expect(cv(s).visible).toBe(true);
    expect(cv(s).granularity).toBe('month');
    expect(cv(s).anchor).toBe(getCurrentDate());
    expect(cv(s).selectedDate).toBe(getCurrentDate()); // 日焦点=锚点
  });

  it('openCalendarView：选中任务有日程时锚点用其日期', () => {
    const s = makeStore();
    s.updateTaskProperty(1, 'schedule', createSpecificDateTimeSchedule('2026-05-08 10:00:00'));
    s.openCalendarView();
    expect(cv(s).anchor).toBe('2026-05-08');
  });

  it('H/L 循环切换粒度：day ↔ week ↔ month（默认 month）', () => {
    const s = makeStore();
    s.openCalendarView(); // month
    s.cycleCalendarGranularity(1); // month → day
    expect(cv(s).granularity).toBe('day');
    s.cycleCalendarGranularity(1); // day → week
    expect(cv(s).granularity).toBe('week');
    s.cycleCalendarGranularity(1); // week → month（回绕）
    expect(cv(s).granularity).toBe('month');
  });

  it('[ ] 翻页：day ±1 天 / week ±7 天 / month ±1 月，焦点跟随锚点', () => {
    const s = makeStore();
    s.openCalendarView(); // month, anchor=today
    s.shiftCalendarPage(1);
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    expect(cv(s).anchor).toBe(formatDate(d));
    expect(cv(s).selectedDate).toBe(formatDate(d)); // 焦点跟随锚点

    s.state.calendarView.granularity = 'week';
    s.shiftCalendarPage(1);
    const w = new Date(d);
    w.setDate(w.getDate() + 7);
    expect(cv(s).anchor).toBe(formatDate(w));
    expect(cv(s).selectedDate).toBe(formatDate(w));

    s.state.calendarView.granularity = 'day';
    s.shiftCalendarPage(-1);
    const dd = new Date(w);
    dd.setDate(dd.getDate() - 1);
    expect(cv(s).anchor).toBe(formatDate(dd));
  });

  it('closeCalendarView 退出', () => {
    const s = makeStore();
    s.openCalendarView();
    s.closeCalendarView();
    expect(cv(s).visible).toBe(false);
  });
});

describe('Store — selectedTaskId 与选中任务一致（create/delete/paste/sort 回归）', () => {
  function makeMultiStore(): Store {
    const store = new Store();
    const mk = (id: number, title: string) => {
      const t = new Task(id);
      t.title = title;
      t.selected = false;
      t.status = TaskState.VIEWING;
      return t;
    };
    store.manager = new TaskListManager(new TaskList([mk(1, 'A'), mk(2, 'B'), mk(3, 'C')]), 4);
    store.manager.selectTask(1);
    store.syncSelection();
    return store;
  }

  it('createNewTask 后 getState().selectedTaskId 指向新任务', () => {
    const s = makeMultiStore();
    const t = s.createNewTask('New');
    expect(s.state.selectedTaskId).toBe(t.id);
    expect(s.getState().selectedTaskId).toBe(t.id);
  });

  it('deleteSelectedTask 后 selectedTaskId 指向后继任务（不再指向已删 id）', () => {
    const s = makeMultiStore();
    s.deleteSelectedTask(); // 删 A → 选中 B
    expect(s.getState().selectedTaskId).toBe(2);
    expect(s.manager.list.items.some((t) => t.id === 1)).toBe(false);
  });

  it('sortTasks 后 selectedTaskId 跟随选中任务的新位置', () => {
    const s = makeMultiStore();
    s.sortTasks('title');
    const selected = s.manager.list.selected!;
    expect(s.getState().selectedTaskId).toBe(selected.id);
  });
});

describe('Store — 日历视图网格交互（j/k 移日焦点 · Enter 开详情 · Esc 返回）', () => {
  function makeCalStore(): Store {
    const store = new Store();
    const mk = (id: number, title: string, schedule?: any) => {
      const t = new Task(id);
      t.title = title;
      t.schedule = schedule;
      t.selected = false;
      t.status = TaskState.VIEWING;
      return t;
    };
    const s1 = createSpecificDateTimeSchedule('2026-05-08 10:00:00'); // 周五
    const s2 = createSpecificDateTimeSchedule('2026-05-09 10:00:00'); // 周六
    const tasks = [mk(1, 'A', s1), mk(2, 'B', s2), mk(3, 'C')];
    tasks[0].selected = true;
    tasks[0].status = TaskState.SELECTED;
    store.manager = new TaskListManager(new TaskList(tasks), 4);
    return store;
  }
  const cv = (s: Store) => s.state.calendarView;

  it('getState 包含 calendarView（键盘路由依赖此字段）', () => {
    const s = makeCalStore();
    s.openCalendarView();
    expect((s.getState() as any).calendarView?.visible).toBe(true);
    expect(cv(s).dayDetail).toBe(false);
  });

  it('open 预选当前任务在范围内的首次出现（日焦点=该日期）', () => {
    const s = makeCalStore();
    s.openCalendarView();
    expect(cv(s).anchor).toBe('2026-05-08'); // 选中任务 A 的日程日期
    expect(cv(s).selectedDate).toBe('2026-05-08');
    expect(cv(s).selectedTaskId).toBe(1);
  });

  it('网格内 jkhl 二维移动（month：h/l ±1 天、j/k ±7 天），自动选中该日第一个任务', () => {
    const s = makeCalStore();
    s.openCalendarView(); // 焦点 05-08（任务 A）
    s.moveCalendarDirection('right'); // → 05-09（任务 B）
    expect(cv(s).selectedDate).toBe('2026-05-09');
    expect(cv(s).selectedTaskId).toBe(2);
    s.moveCalendarDirection('down'); // → 05-16（同列下一周）
    expect(cv(s).selectedDate).toBe('2026-05-16');
    expect(cv(s).selectedTaskId).toBeUndefined();
    s.moveCalendarDirection('up'); // → 05-09
    expect(cv(s).selectedDate).toBe('2026-05-09');
    s.moveCalendarDirection('left'); // → 05-08
    expect(cv(s).selectedDate).toBe('2026-05-08');
    expect(cv(s).selectedTaskId).toBe(1);
  });

  it('month 移出网格：显示月份翻到目标所在月', () => {
    const s = makeCalStore();
    s.openCalendarView();
    s.state.calendarView.selectedDate = '2026-06-06'; // 5 月网格最后一格（6×7）
    s.moveCalendarDirection('down'); // +7 → 06-13 移出网格
    expect(cv(s).anchor).toBe('2026-06-13');
    expect(cv(s).selectedDate).toBe('2026-06-13');
    s.moveCalendarDirection('up'); // -7 → 06-06（6 月网格内，无需翻月）
    expect(cv(s).anchor).toBe('2026-06-13');
    expect(cv(s).selectedDate).toBe('2026-06-06');
  });

  it('week 视图：h/l 周内左右移（跨周翻周），j/k 上下翻周', () => {
    const s = makeCalStore();
    s.openCalendarView();
    s.state.calendarView.granularity = 'week';
    s.state.calendarView.anchor = '2026-05-08'; // 周五；活跃周 05-03..05-09
    s.state.calendarView.selectedDate = '2026-05-08';
    s.moveCalendarDirection('right'); // → 05-09（周六，周内）
    expect(cv(s).selectedDate).toBe('2026-05-09');
    s.moveCalendarDirection('right'); // 跨周 → 下周日 05-10
    expect(cv(s).selectedDate).toBe('2026-05-10');
    expect(cv(s).anchor).toBe('2026-05-15');
    s.moveCalendarDirection('down'); // 翻周：anchor 05-22、焦点 05-17
    expect(cv(s).anchor).toBe('2026-05-22');
    expect(cv(s).selectedDate).toBe('2026-05-17');
  });

  it('week 视图：翻到下月的周时显示月份跟随（anchor 月份 = 下月）', () => {
    const s = makeCalStore();
    s.openCalendarView();
    s.state.calendarView.granularity = 'week';
    s.state.calendarView.anchor = '2026-06-29'; // 周一；活跃周 06-28..07-04（显示 6 月）
    s.state.calendarView.selectedDate = '2026-06-29';
    s.moveCalendarDirection('down'); // → 07-06 所在周（显示 7 月）
    expect(cv(s).anchor).toBe('2026-07-06');
    expect(cv(s).anchor.slice(0, 7)).toBe('2026-07');
    expect(cv(s).selectedDate).toBe('2026-07-06');
  });

  it('数字跳日期：1..当月天数跳转到该日；无效取消焦点（month 与 week）', () => {
    const s = makeCalStore();
    s.openCalendarView(); // month, anchor 05-08
    s.jumpCalendarDay(15);
    expect(cv(s).selectedDate).toBe('2026-05-15');
    s.jumpCalendarDay(31);
    expect(cv(s).selectedDate).toBe('2026-05-31');
    s.jumpCalendarDay(32); // 5 月没有 32 号 → 取消焦点
    expect(cv(s).selectedDate).toBeUndefined();

    s.state.calendarView.granularity = 'week';
    s.state.calendarView.anchor = '2026-05-08';
    s.jumpCalendarDay(20); // 活跃周跟随目标日
    expect(cv(s).anchor).toBe('2026-05-20');
    expect(cv(s).selectedDate).toBe('2026-05-20');

    s.state.calendarView.granularity = 'day';
    s.state.calendarView.anchor = '2026-05-08';
    s.state.calendarView.selectedDate = '2026-05-08';
    s.jumpCalendarDay(10); // day 视图无数字跳转
    expect(cv(s).selectedDate).toBe('2026-05-08');
  });

  it('Enter 打开当日详情，详情内 j/k 选任务，Enter 选中退出视图', () => {
    const s = makeCalStore();
    s.openCalendarView(); // 焦点 05-08
    s.moveCalendarDirection('right'); // 焦点 05-09（B）
    s.openCalendarDayDetail();
    expect(cv(s).dayDetail).toBe(true);
    expect(cv(s).selectedTaskId).toBe(2);
    s.moveCalendarDaySelection(-1); // 详情内只有 B，回卷仍 B
    expect(cv(s).selectedTaskId).toBe(2);
    s.selectCalendarTask();
    expect(cv(s).visible).toBe(false);
    expect(s.manager.list.selected?.id).toBe(2);
  });

  it('详情内 Esc 返回网格；网格内 Esc 退出视图', () => {
    const s = makeCalStore();
    s.openCalendarView();
    s.openCalendarDayDetail();
    expect(cv(s).dayDetail).toBe(true);
    s.closeCalendarDayDetail();
    expect(cv(s).dayDetail).toBe(false);
    expect(cv(s).visible).toBe(true); // 仍在日历
    s.closeCalendarView();
    expect(cv(s).visible).toBe(false);
  });

  it('翻页/切粒度退出详情并校正选中项', () => {
    const s = makeCalStore();
    s.openCalendarView();
    s.openCalendarDayDetail();
    s.shiftCalendarPage(1); // month +1：A/B 不可见
    expect(cv(s).dayDetail).toBe(false);
    expect(cv(s).selectedTaskId).toBeUndefined();
    s.openCalendarDayDetail();
    s.cycleCalendarGranularity(-1); // month → week（anchor 下月，无任务）
    expect(cv(s).dayDetail).toBe(false);
    expect(cv(s).selectedTaskId).toBeUndefined();
  });

  it('视图内无任务时网格移动仍不崩溃', () => {
    const s = makeCalStore();
    s.openCalendarView();
    for (let i = 0; i < 10; i++) s.shiftCalendarPage(1); // 翻到无任务页
    s.moveCalendarDirection('down');
    expect(cv(s).selectedTaskId).toBeUndefined();
    expect(cv(s).selectedDate).toBeTruthy();
  });
});

describe('Store — dirty 状态指示（[+]）', () => {
  it('数据变更置 dirty，保存成功后清除', async () => {
    const store = makeStore();
    const saveSpy = vi.spyOn(store.manager, 'save').mockResolvedValue(undefined);
    expect(store.state.dirty).toBe(false);
    store.createNewTask('X');
    expect(store.state.dirty).toBe(true);
    await store.saveTasks();
    expect(store.state.dirty).toBe(false);
    saveSpy.mockRestore();
  });

  it('undo/redo 置 dirty；无历史时 undo 不置 dirty', () => {
    const store = makeStore();
    expect(store.state.dirty).toBe(false);
    store.undo();
    expect(store.state.dirty).toBe(false);
    store.toggleTaskCompletion();
    store.undo();
    expect(store.state.dirty).toBe(true);
  });

  it('无实际变更的写操作不置 dirty（幂等缩进）', () => {
    const store = makeStore();
    const t = store.manager.list.selected!;
    t.indent = 1;
    store.indentSelectedTask(); // 已是 1，幂等 no-op
    expect(store.state.dirty).toBe(false);
  });
});

describe('Store — vim * / # 词搜索', () => {
  function makeSearchStore(): Store {
    const store = new Store();
    const mk = (id: number, title: string) => {
      const t = new Task(id);
      t.title = title;
      t.selected = false;
      t.status = TaskState.VIEWING;
      return t;
    };
    const tasks = [mk(1, 'Alpha'), mk(2, 'Beta'), mk(3, 'Alpha'), mk(4, 'Gamma')];
    tasks[0].selected = true;
    tasks[0].status = TaskState.SELECTED;
    store.manager = new TaskListManager(new TaskList(tasks), 5);
    return store;
  }

  it('* 以选中任务标题为词跳到下一个匹配，并写入搜索过滤', () => {
    const s = makeSearchStore();
    s.searchWordUnderCursor(1);
    expect(s.state.lastlineContent).toBe('/Alpha');
    expect(s.manager.list.selected?.id).toBe(3);
    s.searchWordUnderCursor(1); // 回卷
    expect(s.manager.list.selected?.id).toBe(1);
  });

  it('# 反向跳到上一个匹配', () => {
    const s = makeSearchStore();
    s.searchWordUnderCursor(-1);
    expect(s.manager.list.selected?.id).toBe(3);
  });
});
