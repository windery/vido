import { Schedule, ScheduleRepeat, ScheduleType, Weekday } from '../domain/schedule';
import { logger } from './logger';
import {
  getCurrentDate,
  getTomorrowDate,
  parseDateTime,
  parseDate,
  formatDate,
} from './date-formatter';

export function getScheduleDisplayText(schedule: Schedule): string {
  return schedule.getDisplayText();
}

export function getScheduleShortText(schedule: Schedule): string {
  return schedule.getShortText();
}

export function createTodaySchedule(): Schedule {
  return new Schedule(ScheduleType.QUICK, {
    quickTime: { date: getCurrentDate() },
  });
}

export function createTomorrowSchedule(): Schedule {
  return new Schedule(ScheduleType.QUICK, {
    quickTime: { date: getTomorrowDate() },
  });
}

export function createSpecificDateSchedule(date: string): Schedule {
  return new Schedule(ScheduleType.QUICK, {
    quickTime: { date },
  });
}

export function createSpecificDateTimeSchedule(dateTime: string): Schedule {
  return new Schedule(ScheduleType.TIME, {
    quickTime: { time: dateTime },
  });
}

export function createWeekdaySchedule(
  weekday: Weekday,
  recurring: boolean = false
): Schedule {
  return new Schedule(ScheduleType.WEEKLY, {
    weeklyTime: { days: [weekday], recurring },
  });
}

export function createTimeRangeSchedule(
  startTime: string,
  endTime: string
): Schedule {
  const today = getCurrentDate();
  return new Schedule(ScheduleType.RANGE, {
    rangeTime: {
      startDateTime: `${today} ${startTime}`,
      endDateTime: `${today} ${endTime}`,
    },
  });
}

export function createDateTimeRangeSchedule(
  startDateTime: string,
  endDateTime: string
): Schedule {
  return new Schedule(ScheduleType.RANGE, {
    rangeTime: { startDateTime, endDateTime },
  });
}

const WEEKDAY_KEYWORDS: Record<string, Weekday> = {
  '周一': Weekday.MONDAY, '星期一': Weekday.MONDAY,
  'monday': Weekday.MONDAY, 'mon': Weekday.MONDAY,
  '周二': Weekday.TUESDAY, '星期二': Weekday.TUESDAY,
  'tuesday': Weekday.TUESDAY, 'tue': Weekday.TUESDAY,
  '周三': Weekday.WEDNESDAY, '星期三': Weekday.WEDNESDAY,
  'wednesday': Weekday.WEDNESDAY, 'wed': Weekday.WEDNESDAY,
  '周四': Weekday.THURSDAY, '星期四': Weekday.THURSDAY,
  'thursday': Weekday.THURSDAY, 'thu': Weekday.THURSDAY,
  '周五': Weekday.FRIDAY, '星期五': Weekday.FRIDAY,
  'friday': Weekday.FRIDAY, 'fri': Weekday.FRIDAY,
  '周六': Weekday.SATURDAY, '星期六': Weekday.SATURDAY,
  'saturday': Weekday.SATURDAY, 'sat': Weekday.SATURDAY,
  '周日': Weekday.SUNDAY, '星期日': Weekday.SUNDAY,
  'sunday': Weekday.SUNDAY, 'sun': Weekday.SUNDAY,
};

const REPEAT_KEYWORDS: Array<{ word: string; repeat: ScheduleRepeat }> = [
  { word: 'daily', repeat: 'daily' },
  { word: 'weekly', repeat: 'weekly' },
  { word: 'monthly', repeat: 'monthly' },
  { word: 'yearly', repeat: 'yearly' },
  { word: '每天', repeat: 'daily' },
  { word: '每星期', repeat: 'weekly' },
  { word: '每周', repeat: 'weekly' },
  { word: '每月', repeat: 'monthly' },
  { word: '每年', repeat: 'yearly' },
];

/** 从输入尾部剥离 repeat 关键词（"2026-05-08 daily" → 日期 + daily） */
export function parseRepeatKeyword(timeStr: string): { body: string; repeat: ScheduleRepeat | undefined } {
  const trimmed = timeStr.trim().toLowerCase();
  for (const { word, repeat } of REPEAT_KEYWORDS) {
    if (trimmed === word) return { body: '', repeat };
    if (trimmed.endsWith(` ${word}`)) {
      return { body: trimmed.slice(0, -(word.length + 1)).trim(), repeat };
    }
  }
  return { body: trimmed, repeat: undefined };
}

/** 给 Schedule 应用 repeat；无日期时用今天兜底 */
function applyRepeat(schedule: Schedule, repeat: ScheduleRepeat): Schedule {
  const body = schedule.getShortText();
  let s = schedule;
  // 无日期（只有时间/范围）时附加今天日期，保证 repeat 有锚点
  if (schedule.type !== ScheduleType.WEEKLY && !body) {
    s = createSpecificDateTimeSchedule(`${getCurrentDate()} 10:00:00`);
  }
  return new Schedule(s.type, {
    quickTime: s.quickTime,
    weeklyTime: s.weeklyTime,
    rangeTime: s.rangeTime,
    repeat,
  });
}

function parseScheduleBody(timeStr: string): Schedule | null {
  const trimmed = timeStr.trim().toLowerCase();

  if (trimmed === '今天' || trimmed === 'today') {
    return createTodaySchedule();
  }
  if (trimmed === '明天' || trimmed === 'tomorrow') {
    return createTomorrowSchedule();
  }
  if (trimmed === '下周' || trimmed === 'next_week') {
    const now = new Date();
    const day = now.getDay();
    const daysUntilNextMonday = (8 - (day === 0 ? 7 : day)) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilNextMonday);
    return createSpecificDateSchedule(formatDate(nextMonday));
  }

  const isRecurring = trimmed.startsWith('每') || trimmed.startsWith('every');
  const cleanTrimmed = isRecurring
    ? trimmed.replace(/^每|^every\s*/, '').trim()
    : trimmed;

  // 优先全词匹配
  for (const [key, weekday] of Object.entries(WEEKDAY_KEYWORDS)) {
    if (cleanTrimmed === key) {
      return new Schedule(ScheduleType.WEEKLY, {
        weeklyTime: { days: [weekday], recurring: isRecurring },
      });
    }
  }
  // 回退到子串匹配
  for (const [key, weekday] of Object.entries(WEEKDAY_KEYWORDS)) {
    if (cleanTrimmed.includes(key)) {
      return new Schedule(ScheduleType.WEEKLY, {
        weeklyTime: { days: [weekday], recurring: isRecurring },
      });
    }
  }

  // 202603061513 → 2026-03-06 15:13:00
  if (/^\d{12}$/.test(trimmed)) {
    const y = trimmed.slice(0, 4);
    const m = trimmed.slice(4, 6);
    const d = trimmed.slice(6, 8);
    const hh = trimmed.slice(8, 10);
    const mm = trimmed.slice(10, 12);
    return createSpecificDateTimeSchedule(`${y}-${m}-${d} ${hh}:${mm}:00`);
  }
  // 20260306 → 2026-03-06（无时间 → 默认上午 10:00）
  if (/^\d{8}$/.test(trimmed)) {
    const y = trimmed.slice(0, 4);
    const m = trimmed.slice(4, 6);
    const d = trimmed.slice(6, 8);
    return createSpecificDateTimeSchedule(`${y}-${m}-${d} 10:00:00`);
  }
  // 15:33 或 15:33:00 → 今天的时间
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const today = getCurrentDate();
    const parts = trimmed.split(':');
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1];
    const ss = parts[2] || '00';
    return createSpecificDateTimeSchedule(`${today} ${hh}:${mm}:${ss}`);
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const dt = trimmed.split(':').length === 2 ? `${trimmed}:00` : trimmed;
    return createSpecificDateTimeSchedule(dt);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    // 纯日期无时间 → 默认上午 10:00
    return createSpecificDateTimeSchedule(`${trimmed} 10:00:00`);
  }

  if (trimmed.includes('-') || trimmed.includes('到')) {
    const sep = trimmed.includes('-') ? '-' : '到';
    const parts = trimmed.split(sep).map((p) => p.trim());
    if (parts.length === 2) {
      const [start, end] = parts;
      const isDateTime = (s: string) =>
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s);
      if (isDateTime(start) && isDateTime(end)) {
        const pad = (s: string) =>
          s.includes(':') && s.split(':').length === 2 ? `${s}:00` : s;
        return createDateTimeRangeSchedule(pad(start), pad(end));
      }
      if (/^\d{2}:\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}:\d{2}$/.test(end)) {
        return createTimeRangeSchedule(start, end);
      }
    }
  }

  // 各分支返回前统一应用 repeat：改造为在具体分支内处理
  return null;
}

/**
 * 解析日程字符串，支持尾随 repeat 关键词：
 * - "2026-05-08 daily" → 该日期 + 每天重复
 * - "daily"（单独）→ 今天 + 每天重复
 * - "weekly"/"monthly"/"yearly" 及中文 每天/每星期/每月/每年 同理
 */
export function parseScheduleFromString(timeStr: string): Schedule | null {
  const { body, repeat } = parseRepeatKeyword(timeStr);
  if (repeat && body === '') {
    return applyRepeat(createTodaySchedule(), repeat);
  }
  const base = parseScheduleBody(body);
  if (!base) return null;
  return repeat ? applyRepeat(base, repeat) : base;
}

export function isScheduleExpired(schedule: Schedule): boolean {
  const now = new Date();

  switch (schedule.type) {
    case ScheduleType.QUICK: {
      const dateStr = schedule.quickTime?.date;
      if (dateStr) {
        const d = parseDate(dateStr);
        if (d) {
          d.setHours(23, 59, 59, 999);
          return now > d;
        }
      }
      return false;
    }
    case ScheduleType.TIME: {
      const timeStr = schedule.quickTime?.time;
      if (timeStr) {
        const d = parseDateTime(timeStr);
        if (d) return now > d;
      }
      return false;
    }
    case ScheduleType.RANGE: {
      const endStr = schedule.rangeTime?.endDateTime;
      if (endStr) {
        const d = parseDateTime(endStr);
        if (d) return now > d;
      }
      return false;
    }
    case ScheduleType.WEEKLY:
      // 周类型不判定过期（每周重复）
      return false;
    default:
      return false;
  }
}

/**
 * 将旧版 TaskSchedule 数据迁移为新的 Schedule 对象。
 * 旧版 type 值: none/today/tomorrow/specific_date/specific_datetime/
 *              weekday/time_range/datetime_range
 */
export function migrateSchedule(raw: any): Schedule | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const oldType = raw.type;
  if (!oldType || oldType === 'none') return undefined;

  // 已经是新版格式直接构造返回
  if (['quick', 'time', 'weekly', 'range'].includes(oldType)) {
    return new Schedule(oldType as ScheduleType, {
      quickTime: raw.quickTime,
      weeklyTime: raw.weeklyTime,
      rangeTime: raw.rangeTime,
    });
  }

  // 旧版格式逐一转换
  switch (oldType) {
    case 'today':
      return createTodaySchedule();
    case 'tomorrow':
      return createTomorrowSchedule();
    case 'specific_date':
      if (raw.specificDate) return createSpecificDateSchedule(raw.specificDate);
      return undefined;
    case 'specific_datetime':
      if (raw.specificDateTime)
        return createSpecificDateTimeSchedule(raw.specificDateTime);
      return undefined;
    case 'weekday':
      if (raw.weekday !== undefined)
        return createWeekdaySchedule(raw.weekday, raw.isRecurring);
      return undefined;
    case 'time_range':
      if (raw.startTime && raw.endTime)
        return createTimeRangeSchedule(raw.startTime, raw.endTime);
      return undefined;
    case 'datetime_range':
      if (raw.startDateTime && raw.endDateTime)
        return createDateTimeRangeSchedule(raw.startDateTime, raw.endDateTime);
      return undefined;
    default:
      logger.warn('schedule-helper', `Unknown old schedule type: ${oldType}`);
      return undefined;
  }
}

// ==================== 智能展示（相对今天文案 + 提醒状态） ====================

export type ScheduleStatus = 'today' | 'overdue' | 'upcoming' | 'normal';

export interface ScheduleDisplay {
  text: string;
  status: ScheduleStatus;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 86400000;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function dayDiff(dateStr: string, today: Date): number | null {
  const d = parseDate(dateStr);
  if (!d) return null;
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

/**
 * 智能展示文案 + 提醒状态：
 * - 今天 → "Today"（有时间只显示时间 "14:30"）
 * - 明天 → "Tomorrow"（+时间）
 * - 昨天 → "Yesterday"
 * - 未来 7 天内 → 周几 "Fri"（+时间）
 * - 其他 → 原日期
 * 状态：today=今天 / overdue=过期 / upcoming=未来7天内 / normal=其他
 */
export function getScheduleDisplay(
  schedule: Schedule,
  now: Date = new Date()
): ScheduleDisplay {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = formatDate(today);

  // 周类型：每周重复，保持原文案
  if (schedule.type === ScheduleType.WEEKLY) {
    return { text: schedule.getDisplayText(), status: 'normal' };
  }

  let dateStr: string | null = null;
  let timeStr: string | null = null;
  let fallback = '';

  const pickDateTime = (raw: string | undefined): void => {
    if (!raw) return;
    const d = parseDateTime(raw);
    if (d) {
      dateStr = formatDate(d);
      timeStr = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    } else {
      fallback = raw;
    }
  };

  if (schedule.type === ScheduleType.QUICK) {
    const qt = schedule.quickTime;
    if (qt?.date) {
      dateStr = qt.date;
    } else if (qt?.time) {
      pickDateTime(qt.time);
    }
  } else if (schedule.type === ScheduleType.TIME) {
    pickDateTime(schedule.quickTime?.time);
  } else if (schedule.type === ScheduleType.RANGE) {
    const st = schedule.rangeTime?.startDateTime;
    const et = schedule.rangeTime?.endDateTime;
    if (st) {
      const d = parseDateTime(st);
      if (d) {
        dateStr = formatDate(d);
        timeStr = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
      }
    }
    if (et) {
      const ed = parseDateTime(et);
      if (ed && timeStr) {
        timeStr = `${timeStr}-${pad2(ed.getHours())}:${pad2(ed.getMinutes())}`;
      }
    }
  }

  if (!dateStr) return { text: fallback || schedule.getDisplayText(), status: 'normal' };

  const diff = dayDiff(dateStr, today);
  let status: ScheduleStatus = 'normal';
  if (diff !== null && diff < 0) status = 'overdue';
  else if (diff === 0) status = 'today';
  else if (diff !== null && diff > 0 && diff <= 7) status = 'upcoming';

  let text: string;
  if (diff === 0) {
    // 今天：有时间只显示时间；否则 Today
    text = timeStr || 'Today';
  } else if (diff === 1) {
    // 明天也显示具体日期（统一：日期提示用日期，不用文字）
    text = timeStr ? `${dateStr} ${timeStr}` : dateStr;
  } else if (diff === -1) {
    text = 'Yesterday';
  } else if (diff !== null && diff > 1 && diff <= 7) {
    // 未来一周内：直接显示具体日期（周几太不明显）
    text = timeStr ? `${dateStr} ${timeStr}` : dateStr;
  } else {
    text = dateStr; // 远期：保持原始日期
  }
  return { text, status };
}
