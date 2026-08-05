import type { Task } from '../domain/task';

/**
 * 计算"当前定位组"（选中任务所在的主任务 + 其连续子任务）的范围。
 * 返回组的首/末任务 id；仅当组 ≥ 2 行（确有子任务）时返回非 null。
 */
export function computeGroupBox(
    tasks: Task[],
    selected: Task | null | undefined
): { startId: number; endId: number } | null {
    if (tasks.length < 2 || !selected) return null;
    const selIdx = tasks.findIndex((t) => t.id === selected.id);
    if (selIdx < 0) return null;
    // 组首：选中是顶级则自己；选中是子任务则回退到其主任务（前面最近的顶级）
    let start = selIdx;
    while (start > 0 && (tasks[start].indent || 0) > 0) start--;
    if ((tasks[start].indent || 0) > 0) return null;
    // 组末：主任务后连续的子任务行
    let end = start;
    while (end + 1 < tasks.length && (tasks[end + 1].indent || 0) > 0) end++;
    if (end === start) return null; // 无子任务，不框
    return { startId: tasks[start].id, endId: tasks[end].id };
}
