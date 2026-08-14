/**
 * 日期视图分组纯函数：范围计算 + repeat 展开 + 任务按日期收集。
 * 不依赖 Vue/Store，可独立测试。
 */
import type { Task } from '../domain/task';
import { ScheduleRepeat, ScheduleType } from '../domain/schedule';
import { formatDate, parseDate } from './date-formatter';

export type CalendarGranularity = 'day' | 'week' | 'month';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** 提取任务日程的主日期（"YYYY-MM-DD"）；每周类型/无日程 → null */
export function scheduleDate(task: Task): string | null {
  const s = task.schedule;
  if (!s) return null;
  const pick = (raw?: string): string | null => {
    if (!raw) return null;
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  };
  switch (s.type) {
    case ScheduleType.QUICK:
      if (s.quickTime?.date) return s.quickTime.date;
      return pick(s.quickTime?.time);
    case ScheduleType.TIME:
      return pick(s.quickTime?.time);
    case ScheduleType.RANGE:
      return pick(s.rangeTime?.startDateTime);
    default:
      return null; // WEEKLY：每周重复，不入日历
  }
}

/** repeat 展开：任务主日期在 [start, end] 内的所有出现日期（含 repeat 扩展） */
export function repeatDates(
  dateStr: string,
  repeat: ScheduleRepeat | undefined,
  startStr: string,
  endStr: string
): string[] {
  const base = parseDate(dateStr);
  const start = parseDate(startStr)!;
  const end = parseDate(endStr)!;
  const out: string[] = [];
  if (base && base >= start && base <= end) out.push(dateStr);
  if (!base || !repeat) return out;

  const cur = new Date(start);
  while (cur <= end) {
    const match =
      repeat === 'daily' ? true
      : repeat === 'weekly' ? cur.getDay() === base.getDay()
      : repeat === 'monthly' ? cur.getDate() === base.getDate()
      : cur.getMonth() === base.getMonth() && cur.getDate() === base.getDate();
    if (match) {
      const ds = formatDate(cur);
      if (ds !== dateStr && !out.includes(ds)) out.push(ds);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out.sort();
}

/** 当前视图范围：day = 锚点当天；week = 锚点所在周（周日~周六）；month = 锚点所在月 */
export function getCalendarRange(
  granularity: CalendarGranularity,
  anchor: string
): { start: Date; end: Date; label: string } {
  const a = parseDate(anchor) || new Date();
  if (granularity === 'day') {
    return { start: a, end: a, label: formatDate(a) };
  }
  if (granularity === 'week') {
    const start = new Date(a);
    start.setDate(a.getDate() - a.getDay()); // 周日
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end, label: `${formatDate(start)} ~ ${formatDate(end)}` };
  }
  const start = new Date(a.getFullYear(), a.getMonth(), 1);
  const end = new Date(a.getFullYear(), a.getMonth() + 1, 0);
  return { start, end, label: `${MONTH_NAMES[a.getMonth()]} ${a.getFullYear()}` };
}

/** 收集范围内任务，按日期分组排序 */
export function collectTasksInRange(
  tasks: Task[],
  granularity: CalendarGranularity,
  anchor: string
): Array<{ date: string; tasks: Task[] }> {
  const { start, end } = getCalendarRange(granularity, anchor);
  const s = formatDate(start);
  const e = formatDate(end);
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    const dateStr = scheduleDate(t);
    if (!dateStr) continue;
    for (const ds of repeatDates(dateStr, t.schedule?.repeat, s, e)) {
      if (!map.has(ds)) map.set(ds, []);
      map.get(ds)!.push(t);
    }
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([date, ts]) => ({ date, tasks: ts }));
}

/** 日期对应的周几名 */
export function weekdayName(dateStr: string): string {
  const d = parseDate(dateStr);
  return d ? DAY_NAMES[d.getDay()] : '';
}

/**
 * 日期组件网格的日期序列（j/k 按此顺序移动日焦点）：
 * day = 锚点当天；week = 锚点所在周 7 天（周日~周六）；month = 6×7 共 42 格（含邻月淡化格，周日开头）
 */
export function calendarGridCells(
  granularity: CalendarGranularity,
  anchor: string
): string[] {
  const a = parseDate(anchor) || new Date();
  if (granularity === 'day') return [anchor];
  if (granularity === 'week') {
    const start = new Date(a);
    start.setDate(a.getDate() - a.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return formatDate(d);
    });
  }
  const year = a.getFullYear();
  const month = a.getMonth();
  const offset = new Date(year, month, 1).getDay();
  return Array.from({ length: 42 }, (_, i) =>
    formatDate(new Date(year, month, 1 - offset + i))
  );
}
