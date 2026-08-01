/**
 * TaskList 聚合根 —— 任务列表的数据和导航/查询逻辑
 * 不可变：所有方法返回新 TaskList
 */

import { Task, TaskState } from '../task';

/** 搜索匹配（与 vido.html 一致：大小写不敏感，匹配标题/内容/标签） */
export function taskMatchesSearch(t: Task, term: string): boolean {
  if (!term) return true;
  const q = term.toLowerCase();
  return (t.title || '').toLowerCase().includes(q)
    || (t.content || '').toLowerCase().includes(q)
    || (t.tags || []).some((x) => x.toLowerCase().includes(q));
}

export class TaskList {
  constructor(readonly items: Task[], readonly searchFilter?: string) {}

  // ======== 查询 ========

  get all(): Task[] {
    if (!this.searchFilter) return this.items;
    const term = this.searchFilter;
    if (!term) return this.items;
    return this.items.filter(
      (t) => t.title.includes(term) || t.content.includes(term)
    );
  }

  get selected(): Task | null {
    return this.all.find((t) => t.selected) || null;
  }

  get selectedIndex(): number {
    return this.all.findIndex((t) => t.selected);
  }

  get isSearching(): boolean {
    return !!(this.searchFilter && this.searchFilter.length > 0);
  }

  // ======== 导航 ========

  selectTask(id: number): TaskList {
    const matchIdx = this.items.reduce(
      (last, t, i) => (t.id === id ? i : last), -1
    );
    if (matchIdx < 0) return this;
    return this.withItems(
      this.items.map((t, i) => ({
        ...t,
        selected: i === matchIdx,
        status: i === matchIdx ? TaskState.SELECTED : TaskState.VIEWING,
      }))
    );
  }

  selectNext(): TaskList {
    const visible = this.all;
    if (visible.length === 0) return this;
    const idx = visible.findIndex((t) => t.selected);
    const nextIdx = idx < visible.length - 1 ? idx + 1 : 0;
    if (nextIdx === idx) return this;
    return this.selectTask(visible[nextIdx].id);
  }

  selectPrevious(): TaskList {
    const visible = this.all;
    if (visible.length === 0) return this;
    const idx = visible.findIndex((t) => t.selected);
    const prevIdx = idx > 0 ? idx - 1 : visible.length - 1;
    if (prevIdx === idx) return this;
    return this.selectTask(visible[prevIdx].id);
  }

  goToFirst(): TaskList {
    const visible = this.all;
    return visible.length > 0 ? this.selectTask(visible[0].id) : this;
  }

  goToLast(): TaskList {
    const visible = this.all;
    return visible.length > 0
      ? this.selectTask(visible[visible.length - 1].id)
      : this;
  }

  // ======== 内部工具 ========

  withItems(items: Task[]): TaskList {
    return new TaskList(items, this.searchFilter);
  }

  withSearch(filter?: string): TaskList {
    return new TaskList(this.items, filter);
  }
}
