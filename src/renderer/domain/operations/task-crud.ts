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
  task.updatedAt = Date.now();

  const items = list.items.map((t) => ({ ...t, selected: false, status: TaskState.VIEWING })) as Task[];
  const selectedIdx = list.items.findIndex((t) => t.selected);
  if (selectedIdx >= 0 && insertAfter) {
    items.splice(selectedIdx + 1, 0, task);
  } else if (selectedIdx >= 0 && !insertAfter) {
    items.splice(selectedIdx, 0, task);
  } else {
    items.push(task);
  }

  return { list: new TaskList(items), task };
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
  return new TaskList(items as Task[]);
}

export function toggleComplete(list: TaskList): TaskList {
  const items = [...list.items] as Task[];
  const idx = items.findIndex((t) => t.selected);
  if (idx < 0) return list;
  items[idx] = { ...items[idx], completed: !items[idx].completed, updatedAt: Date.now() } as Task;
  return new TaskList(items as Task[]);
}

export function toggleFlag(list: TaskList): TaskList {
  const items = [...list.items] as Task[];
  const idx = items.findIndex((t) => t.selected);
  if (idx < 0) return list;
  items[idx] = { ...items[idx], flagged: !items[idx].flagged, updatedAt: Date.now() } as Task;
  return new TaskList(items as Task[]);
}

/** 数据属性（更新时刷新 updatedAt）；UI/光标状态不视为数据变更 */
const DATA_KEYS = new Set(['title', 'content', 'completed', 'flagged', 'priority', 'tags', 'schedule']);

export function updateProperty(list: TaskList, taskId: number, key: string, value: any): TaskList {
  const items = list.items.map((t) =>
    t.id === taskId
      ? ({ ...t, [key]: value, ...(DATA_KEYS.has(key) ? { updatedAt: Date.now() } : {}) } as Task)
      : t
  );
  return new TaskList(items);
}

export function updateCursor(list: TaskList, taskId: number, line: number, col: number): TaskList {
  const items = list.items.map((t) =>
    t.id === taskId ? ({ ...t, cursorLine: line, cursorColumn: col } as Task) : t
  );
  return new TaskList(items);
}

export function startTitleEditing(list: TaskList): TaskList {
  const items = list.items.map((t) =>
    t.selected ? ({ ...t, status: TaskState.TITLE_EDITING } as Task) : t
  );
  return new TaskList(items);
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
    case 'updated': items.sort((a, b) => (b.updatedAt || b.id) - (a.updatedAt || a.id)); break;
    case 'completed': items.sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1)); break;
  }
  return new TaskList(items as Task[]);
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
  task.updatedAt = Date.now();
  task.selected = true;
  task.status = TaskState.VIEWING;

  const items = list.items.map((t) => ({ ...t, selected: false, status: TaskState.VIEWING })) as Task[];
  const idx = list.items.findIndex((t) => t.selected);
  if (idx >= 0) items.splice(idx + 1, 0, task);
  else items.push(task);

  return { list: new TaskList(items as Task[]), task };
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

/** vim dd：删除光标所在行；光标落到下一行行首（原行号），删最后一行则落在新的最后一行 */
export function deleteLineAtCursor(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const content = task.content || '';
  const lines = content.split('\n');
  const line = task.cursorLine || 0;
  if (line >= lines.length) return list;
  lines.splice(line, 1);
  const newContent = lines.join('\n');
  const newLine = line >= lines.length ? Math.max(0, lines.length - 1) : line;
  return updateCursor(updateProperty(list, task.id, 'content', newContent), task.id, newLine, 0);
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

// ==================== vim 编辑操作（content-nav 模式） ====================

function linesOf(task: Task): string[] {
  return (task.content || '').split('\n');
}
function setLines(list: TaskList, task: Task, lines: string[]): TaskList {
  return updateProperty(list, task.id, 'content', lines.join('\n'));
}

/** vim x：删光标处字符；行尾则连接下一行（删换行符） */
export function deleteCharAtCursor(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const lines = linesOf(task);
  const line = task.cursorLine || 0, col = task.cursorColumn || 0;
  const text = lines[line] || '';
  if (col < text.length) {
    lines[line] = text.slice(0, col) + text.slice(col + 1);
    return updateCursor(setLines(list, task, lines), task.id, line, col);
  }
  if (line < lines.length - 1) {
    lines[line] = text + lines[line + 1];
    lines.splice(line + 1, 1);
    return updateCursor(setLines(list, task, lines), task.id, line, col);
  }
  return list;
}

/** vim X：删光标前一字符；行首则连接上一行 */
export function deleteCharBeforeCursor(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const lines = linesOf(task);
  const line = task.cursorLine || 0, col = task.cursorColumn || 0;
  const text = lines[line] || '';
  if (col > 0) {
    lines[line] = text.slice(0, col - 1) + text.slice(col);
    return updateCursor(setLines(list, task, lines), task.id, line, col - 1);
  }
  if (line > 0) {
    const prev = lines[line - 1] || '';
    lines[line - 1] = prev + text;
    lines.splice(line, 1);
    return updateCursor(setLines(list, task, lines), task.id, line - 1, prev.length);
  }
  return list;
}

// ---- 词定位辅助（行内） ----
function nextWordStartInLine(text: string, col: number): number {
  let i = col;
  while (i < text.length && isWordChar(text[i])) i++;
  while (i < text.length && /\s/.test(text[i])) i++;
  return i;
}
function wordEndInLine(text: string, col: number): number {
  let i = col;
  while (i < text.length && /\s/.test(text[i])) i++;
  while (i < text.length && isWordChar(text[i])) i++;
  return i;
}
function wordStartInLine(text: string, col: number): number {
  let i = col;
  while (i > 0 && !isWordChar(text[i - 1])) i--;
  while (i > 0 && isWordChar(text[i - 1])) i--;
  return i;
}

/** vim dw：删到下一个词首（行内无目标则删到行尾） */
export function deleteWordForward(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const lines = linesOf(task);
  const line = task.cursorLine || 0, col = task.cursorColumn || 0;
  const text = lines[line] || '';
  const end = nextWordStartInLine(text, col);
  if (end > col) {
    lines[line] = text.slice(0, col) + text.slice(end);
    return updateCursor(setLines(list, task, lines), task.id, line, col);
  }
  return list;
}

/** vim de：删到当前词尾（含光标后到词尾） */
export function deleteWordEnd(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const lines = linesOf(task);
  const line = task.cursorLine || 0, col = task.cursorColumn || 0;
  const text = lines[line] || '';
  const end = wordEndInLine(text, col);
  if (end > col) {
    lines[line] = text.slice(0, col) + text.slice(end);
    return updateCursor(setLines(list, task, lines), task.id, line, col);
  }
  return list;
}

/** vim db：删到当前/上一词首 */
export function deleteWordBackward(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const lines = linesOf(task);
  const line = task.cursorLine || 0, col = task.cursorColumn || 0;
  const text = lines[line] || '';
  const start = wordStartInLine(text, col);
  if (start < col) {
    lines[line] = text.slice(0, start) + text.slice(col);
    return updateCursor(setLines(list, task, lines), task.id, line, start);
  }
  return list;
}

/** vim d$ / D：删到行尾（含光标字符） */
export function deleteToLineEnd(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const lines = linesOf(task);
  const line = task.cursorLine || 0, col = task.cursorColumn || 0;
  const text = lines[line] || '';
  if (col < text.length) {
    lines[line] = text.slice(0, col);
    return updateCursor(setLines(list, task, lines), task.id, line, col);
  }
  return list;
}

/** vim d0：删到行首（不含光标字符） */
export function deleteToLineStart(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const lines = linesOf(task);
  const line = task.cursorLine || 0, col = task.cursorColumn || 0;
  const text = lines[line] || '';
  if (col > 0) {
    lines[line] = text.slice(col);
    return updateCursor(setLines(list, task, lines), task.id, line, 0);
  }
  return list;
}

/** vim dgg：删第 1 行到光标行（含），光标落在新的第 1 行 */
export function deleteToFirstLine(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const lines = linesOf(task);
  const line = task.cursorLine || 0;
  if (line <= 0) return list;
  lines.splice(0, line);
  return updateCursor(setLines(list, task, lines), task.id, 0, 0);
}

/** vim dG：删光标行到末行（含），光标落在新的最后一行 */
export function deleteToLastLine(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const lines = linesOf(task);
  const line = task.cursorLine || 0;
  lines.splice(line, lines.length - line);
  const newLine = Math.max(0, lines.length - 1);
  return updateCursor(setLines(list, task, lines), task.id, newLine, 0);
}

/** vim J：合并下一行到当前行（中间加一个空格），光标落在连接处 */
export function mergeLineBelow(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const lines = linesOf(task);
  const line = task.cursorLine || 0;
  if (line >= lines.length - 1) return list;
  const text = lines[line] || '';
  const next = lines[line + 1];
  lines[line] = text ? `${text} ${next}` : next;
  lines.splice(line + 1, 1);
  const col = (lines[line] || '').length - (next?.length || 0);
  return updateCursor(setLines(list, task, lines), task.id, line, col);
}

/** vim r{char}：替换光标处字符（行尾不可替换） */
export function replaceCharAtCursor(list: TaskList, char: string): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const lines = linesOf(task);
  const line = task.cursorLine || 0, col = task.cursorColumn || 0;
  const text = lines[line] || '';
  if (col >= text.length || !char) return list;
  lines[line] = text.slice(0, col) + char + text.slice(col + 1);
  return updateCursor(setLines(list, task, lines), task.id, line, col + 1);
}

/** vim ~：切换光标字符大小写，光标右移 */
export function swapCaseAtCursor(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const lines = linesOf(task);
  const line = task.cursorLine || 0, col = task.cursorColumn || 0;
  const text = lines[line] || '';
  const ch = text[col];
  if (!ch) return list;
  const swapped = ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase();
  lines[line] = text.slice(0, col) + swapped + text.slice(col + 1);
  const newCol = col + 1 <= (lines[line] || '').length ? col + 1 : col;
  return updateCursor(setLines(list, task, lines), task.id, line, newCol);
}

/** 复制辅助：返回光标处要复制的文本（line=整行 / word=当前词 / toEnd=到行尾） */
export function copyTextAtCursor(list: TaskList, kind: 'line' | 'word' | 'toEnd'): string {
  const task = list.selected;
  if (!task) return '';
  const lines = linesOf(task);
  const line = task.cursorLine || 0, col = task.cursorColumn || 0;
  const text = lines[line] || '';
  if (kind === 'line') return text;
  if (kind === 'toEnd') return text.slice(col);
  const end = wordEndInLine(text, col);
  return text.slice(col, end);
}

/** vim p / P：粘贴。isLine=整行模式（光标行下方/上方插入新行），否则光标后/前插入文本 */
export function pasteTextAtCursor(list: TaskList, text: string, isLine: boolean, before: boolean): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION || !text) return list;
  const lines = linesOf(task);
  const line = task.cursorLine || 0, col = task.cursorColumn || 0;
  if (isLine) {
    lines.splice(before ? line : line + 1, 0, text);
    const newLine = before ? line : line + 1;
    return updateCursor(setLines(list, task, lines), task.id, newLine, 0);
  }
  const cur = lines[line] || '';
  const insertAt = before ? col : col;
  lines[line] = cur.slice(0, insertAt) + text + cur.slice(insertAt);
  return updateCursor(setLines(list, task, lines), task.id, line, insertAt + text.length);
}

/** vim O：上方插入空行，光标落新行行首 */
export function insertLineAbove(list: TaskList): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return list;
  const lines = linesOf(task);
  const line = task.cursorLine || 0;
  lines.splice(line, 0, '');
  return updateCursor(setLines(list, task, lines), task.id, line, 0);
}

/** tab：成为上一个任务的直接子任务（indent = prev.indent + 1）。
 *  幂等：连续按 tab 结果不变——父任务的子任务就是它，不会继续加深。 */
export function indentTask(list: TaskList, id: number): TaskList {
  const task = list.items.find((t) => t.id === id);
  if (!task) return list;
  const items = list.items;
  const idx = items.findIndex((t) => t.id === id);
  const prev = idx > 0 ? items[idx - 1] : null;
  if (!prev) return list; // 第一个任务无法缩进
  const newIndent = prev.indent + 1;
  if (newIndent === task.indent) return list;
  return updateProperty(list, id, 'indent', newIndent);
}

/** Shift+Tab：取消缩进（indent-1，最低 0） */
export function unindentTask(list: TaskList, id: number): TaskList {
  const task = list.items.find((t) => t.id === id);
  if (!task || task.indent <= 0) return list;
  return updateProperty(list, id, 'indent', task.indent - 1);
}
