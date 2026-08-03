import { Task, TaskState, TaskPriority } from '../task';
import { TaskList } from '../entities/task-list';

let idCounter = 0;

export function setMaxId(id: number): void { idCounter = Math.max(idCounter, id); }
export function nextId(): number { return ++idCounter; }

export function createTask(list: TaskList, title: string = '', insertAfter: boolean = true): { list: TaskList; task: Task } {
  const task = new Task(nextId());
  task.title = title;
  task.selected = true;
  task.status = TaskState.TITLE_EDITING;

  const items = list.items.map((t) => ({ ...t, selected: false, status: TaskState.VIEWING })) as Task[];
  const selectedIdx = list.items.findIndex((t) => t.selected);
  if (selectedIdx >= 0 && insertAfter) {
    items.splice(selectedIdx + 1, 0, task);
  } else if (selectedIdx >= 0 && !insertAfter) {
    items.splice(selectedIdx, 0, task);
  } else {
    items.push(task);
  }

  return { list: new TaskList(items, list.searchFilter), task };
}

export function deleteSelected(list: TaskList): TaskList {
  const items = [...list.items] as Task[];
  const idx = items.findIndex((t) => t.selected);
  if (idx < 0) return list;
  items.splice(idx, 1);
  if (items.length > 0) {
    const newIdx = Math.min(idx, items.length - 1);
    items[newIdx] = { ...items[newIdx], selected: true, status: TaskState.SELECTED } as Task;
  }
  return new TaskList(items as Task[], list.searchFilter);
}

export function toggleComplete(list: TaskList): TaskList {
  const items = [...list.items] as Task[];
  const idx = items.findIndex((t) => t.selected);
  if (idx < 0) return list;
  items[idx] = { ...items[idx], completed: !items[idx].completed } as Task;
  return new TaskList(items as Task[], list.searchFilter);
}

export function toggleFlag(list: TaskList): TaskList {
  const items = [...list.items] as Task[];
  const idx = items.findIndex((t) => t.selected);
  if (idx < 0) return list;
  items[idx] = { ...items[idx], flagged: !items[idx].flagged } as Task;
  return new TaskList(items as Task[], list.searchFilter);
}

export function updateProperty(list: TaskList, taskId: number, key: string, value: any): TaskList {
  const items = list.items.map((t) =>
    t.id === taskId ? ({ ...t, [key]: value } as Task) : t
  );
  return new TaskList(items, list.searchFilter);
}

export function updateCursor(list: TaskList, taskId: number, line: number, col: number): TaskList {
  const items = list.items.map((t) =>
    t.id === taskId ? ({ ...t, cursorLine: line, cursorColumn: col } as Task) : t
  );
  return new TaskList(items, list.searchFilter);
}

export function startTitleEditing(list: TaskList): TaskList {
  const items = list.items.map((t) =>
    t.selected ? ({ ...t, status: TaskState.TITLE_EDITING } as Task) : t
  );
  return new TaskList(items, list.searchFilter);
}

export function sortTasks(list: TaskList, type: string): TaskList {
  const items = [...list.items] as Task[];
  switch (type) {
    case 'title': items.sort((a, b) => a.title.localeCompare(b.title)); break;
    case 'priority': {
      const order: Record<string, number> = { [TaskPriority.HIGH]: 3, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 1 };
      items.sort((a, b) => (order[b.priority || TaskPriority.MEDIUM] || 2) - (order[a.priority || TaskPriority.MEDIUM] || 2));
      break;
    }
    case 'created': items.sort((a, b) => a.id - b.id); break;
    case 'updated': items.sort((a, b) => b.id - a.id); break;
    case 'completed': items.sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1)); break;
  }
  return new TaskList(items as Task[], list.searchFilter);
}

export function copySelected(list: TaskList): { list: TaskList; clipboard: Task | null } {
  const task = list.selected;
  if (!task) return { list, clipboard: null };
  const copy = { ...task, id: 0, sourceId: task.id, selected: false, status: TaskState.VIEWING } as Task;
  return { list, clipboard: copy };
}

export function pasteTask(list: TaskList, clipboard: Task | null): { list: TaskList; task?: Task } {
  if (!clipboard) return { list };
  const task = new Task(nextId());
  task.title = clipboard.title;
  task.content = clipboard.content;
  task.priority = clipboard.priority;
  task.tags = [...(clipboard.tags || [])];
  task.schedule = clipboard.schedule;
  task.flagged = !!clipboard.flagged;
  task.selected = true;
  task.status = TaskState.VIEWING;

  const items = list.items.map((t) => ({ ...t, selected: false, status: TaskState.VIEWING })) as Task[];
  const idx = list.items.findIndex((t) => t.selected);
  if (idx >= 0) items.splice(idx + 1, 0, task);
  else items.push(task);

  return { list: new TaskList(items as Task[], list.searchFilter), task };
}

export function insertNewLineBelow(list: TaskList): TaskList {
  const task = list.selected;
  if (!task) return list;
  const content = task.content || '';
  const lines = content.split('\n');
  const cursorLine = task.cursorLine ?? 0;
  lines.splice(cursorLine + 1, 0, '');
  const newContent = lines.join('\n');
  return updateCursor(updateProperty(list, task.id, 'content', newContent), task.id, cursorLine + 1, 0);
}

export function moveCursorUp(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const line = task.cursorLine || 0;
  if (line <= 0) return list;
  const content = task.content || '';
  const lines = content.split('\n');
  const col = Math.min(task.cursorColumn || 0, (lines[line - 1] || '').length);
  return updateCursor(list, task.id, line - 1, col);
}

export function moveCursorDown(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const content = task.content || '';
  const lines = content.split('\n');
  const line = task.cursorLine || 0;
  if (line >= lines.length - 1) return list;
  const col = Math.min(task.cursorColumn || 0, (lines[line + 1] || '').length);
  return updateCursor(list, task.id, line + 1, col);
}

export function moveCursorLeft(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const line = task.cursorLine || 0;
  const col = task.cursorColumn || 0;
  if (col > 0) return updateCursor(list, task.id, line, col - 1);
  if (line > 0) {
    const content = task.content || '';
    const lines = content.split('\n');
    return updateCursor(list, task.id, line - 1, lines[line - 1]?.length || 0);
  }
  return list;
}

export function moveCursorRight(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const content = task.content || '';
  const lines = content.split('\n');
  const line = task.cursorLine || 0;
  const col = task.cursorColumn || 0;
  const lineLen = lines[line]?.length || 0;
  if (col < lineLen) return updateCursor(list, task.id, line, col + 1);
  if (line < lines.length - 1) return updateCursor(list, task.id, line + 1, 0);
  return list;
}

export function moveCursorToLineStart(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  return updateCursor(list, task.id, task.cursorLine || 0, 0);
}

export function moveCursorToLineEnd(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const content = task.content || '';
  const lines = content.split('\n');
  const lineLen = lines[task.cursorLine || 0]?.length || 0;
  return updateCursor(list, task.id, task.cursorLine || 0, lineLen);
}

const isWordChar = (c: string): boolean => c !== '' && !/\s/.test(c);

/** vim w：跳到下一个词首（空白为分隔） */
export function moveCursorWordForward(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const content = task.content || '';
  const lines = content.split('\n');
  let line = task.cursorLine || 0;
  let col = task.cursorColumn || 0;

  while (line < lines.length) {
    const text = lines[line] || '';
    // 跳过当前词
    let i = col;
    while (i < text.length && isWordChar(text[i])) i++;
    // 跳过空白
    while (i < text.length && /\s/.test(text[i])) i++;
    if (i < text.length) return updateCursor(list, task.id, line, i);
    line++;
    col = 0;
  }
  return list;
}

/** vim b：跳到上一个词首（空白为分隔） */
export function moveCursorWordBackward(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const content = task.content || '';
  const lines = content.split('\n');
  let line = task.cursorLine || 0;
  let col = task.cursorColumn || 0;

  while (line >= 0) {
    const text = lines[line] || '';
    let i = Math.min(col, text.length) - 1;
    // 跳过空白
    while (i >= 0 && /\s/.test(text[i])) i--;
    if (i < 0) {
      if (line === 0) return list;
      line--;
      col = (lines[line] || '').length;
      continue;
    }
    // 回退到词首
    while (i > 0 && isWordChar(text[i - 1])) i--;
    return updateCursor(list, task.id, line, i);
  }
  return list;
}

/** vim e：跳到当前词（或下一个词）的词尾 */
export function moveCursorWordEnd(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const content = task.content || '';
  const lines = content.split('\n');
  let line = task.cursorLine || 0;
  let col = task.cursorColumn || 0;

  while (line < lines.length) {
    const text = lines[line] || '';
    let i = col;
    // 若处于空白，跳到当前行下一个词首
    while (i < text.length && /\s/.test(text[i])) i++;
    if (i < text.length) {
      // 走到词尾后一字符，光标停在该位置
      let j = i;
      while (j < text.length && isWordChar(text[j])) j++;
      return updateCursor(list, task.id, line, j);
    }
    // 当前行无词，跳到下一行开头
    if (line >= lines.length - 1) break;
    line++;
    col = 0;
  }
  return list;
}

export function moveCursorToFirstLine(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const content = task.content || '';
  const lines = content.split('\n');
  const col = Math.min(task.cursorColumn || 0, lines[0]?.length || 0);
  return updateCursor(list, task.id, 0, col);
}

export function moveCursorToLastLine(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const content = task.content || '';
  const lines = content.split('\n');
  const lastLine = Math.max(0, lines.length - 1);
  const col = Math.min(task.cursorColumn || 0, lines[lastLine]?.length || 0);
  return updateCursor(list, task.id, lastLine, col);
}
