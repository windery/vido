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

/**
 * vim p / P 粘贴外部文本（系统剪贴板/其他来源）：字符式（charwise）粘贴——
 * 多行文本在当前光标处切行插入（第一段接光标前、最后一段接光标后、中间段独立成行）；
 * p 光标落粘贴内容末尾、P 落粘贴内容开头。
 */
export function pasteExternalText(list: TaskList, text: string, before: boolean): TaskList {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION || !text) return list;
  const lines = linesOf(task);
  const line = task.cursorLine || 0;
  const col = task.cursorColumn || 0;
  const cur = lines[line] ?? '';
  const head = cur.slice(0, col);
  const tail = cur.slice(col);
  const parts = text.split('\n');
  const newLines = parts.map((p, i) => {
    if (parts.length === 1) return head + p + tail;
    if (i === 0) return head + p;
    if (i === parts.length - 1) return p + tail;
    return p;
  });
  lines.splice(line, 1, ...newLines);
  const updated = setLines(list, task, lines);
  if (before) {
    // P：光标在粘贴内容开头（head 之后）
    return updateCursor(updated, task.id, line, head.length);
  }
  // p：光标在粘贴内容末尾（tail 之前）
  const endLine = line + parts.length - 1;
  const endCol = parts.length === 1 ? head.length + parts[0].length : parts[parts.length - 1].length;
  return updateCursor(updated, task.id, endLine, endCol);
}

// ==================== Ctrl+V 可视块模式 ====================

export interface BlockSelection {
  text: string;
  startLine: number;
  endLine: number;
  startCol: number;
  endCol: number; // 含
}

/** 可视块选区：锚点（Ctrl+V 按下时光标）与当前光标围成的矩形；行序/列序自动取 min/max */
export function getBlockSelection(
  list: TaskList,
  anchorLine: number,
  anchorCol: number
): BlockSelection | null {
  const task = list.selected;
  if (!task || task.status !== TaskState.CONTENT_NAVIGATION) return null;
  const lines = linesOf(task);
  const curLine = task.cursorLine || 0;
  const curCol = task.cursorColumn || 0;
  const startLine = Math.min(anchorLine, curLine);
  const endLine = Math.min(Math.max(anchorLine, curLine), lines.length - 1);
  const startCol = Math.min(anchorCol, curCol);
  const endCol = Math.max(anchorCol, curCol);
  const parts: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    const t = lines[i] ?? '';
    parts.push(t.slice(startCol, Math.min(endCol + 1, t.length)));
  }
  return { text: parts.join('\n'), startLine, endLine, startCol, endCol };
}

/** vim 可视块 x/d：删除矩形块；短行不足块起列时该行不删字符；光标落块左上角 */
export function deleteBlock(list: TaskList, anchorLine: number, anchorCol: number): TaskList {
  const sel = getBlockSelection(list, anchorLine, anchorCol);
  const task = list.selected;
  if (!sel || !task) return list;
  const lines = linesOf(task);
  for (let i = sel.startLine; i <= sel.endLine && i < lines.length; i++) {
    const t = lines[i] ?? '';
    if (sel.startCol < t.length) {
      lines[i] = t.slice(0, sel.startCol) + t.slice(Math.min(sel.endCol + 1, t.length));
    }
  }
  return updateCursor(setLines(list, task, lines), task.id, sel.startLine, sel.startCol);
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

/** tab：缩进为父任务的直接子任务（indent = 1，最多 1 级）。
 *  父任务 = 上一个顶级任务：prev 是顶级则父=prev；prev 是子任务则父=其父
 *  （prev 前面的顶级任务）——当前任务与上一个子任务同父同级。
 *  幂等：已缩进（indent=1）时结果不变。 */
export function indentTask(list: TaskList, id: number): TaskList {
  const task = list.items.find((t) => t.id === id);
  if (!task) return list;
  const idx = list.items.findIndex((t) => t.id === id);
  if (idx <= 0) return list; // 第一个任务无法缩进（没有可依附的父任务）
  if (task.indent === 1) return list; // 幂等：已是子任务，不会产生 2 级
  return updateProperty(list, id, 'indent', 1);
}

/** Shift+Tab：取消缩进（indent-1，最低 0）。
 *  父任务按"前一个顶级任务"推断——若只取消当前任务，其后的兄弟子任务会
 *  错误地挂到它名下。因此取消子任务时，其后连续的兄弟子任务跟随取消
 *  （整个子任务组一起回到顶级）。 */
export function unindentTask(list: TaskList, id: number): TaskList {
  const task = list.items.find((t) => t.id === id);
  if (!task || task.indent <= 0) return list;
  let updated = updateProperty(list, id, 'indent', task.indent - 1);
  if (task.indent === 1) {
    // 后续连续子任务（indent>0，兄弟）跟随取消，避免归属错乱
    for (let i = list.items.findIndex((t) => t.id === id) + 1;
         i < list.items.length && list.items[i].indent > 0; i++) {
      updated = updateProperty(updated, list.items[i].id, 'indent', 0);
    }
  }
  return updated;
}
