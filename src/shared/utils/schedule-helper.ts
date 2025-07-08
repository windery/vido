/**
 * TaskSchedule 工具类
 * 处理任务时间安排的显示、创建和操作
 */

import { TaskSchedule, ScheduleType, Weekday } from '../domain/task';
import { getWeekdayName, parseDateTime, parseDate } from './date-formatter';

/**
 * 获取TaskSchedule的显示文本
 * @param schedule TaskSchedule对象
 * @returns 用于显示的文本字符串
 */
export function getScheduleDisplayText(schedule: TaskSchedule): string {
  switch (schedule.type) {
    case ScheduleType.NONE:
      return '';

    case ScheduleType.TODAY:
      return '今天';

    case ScheduleType.TOMORROW:
      return '明天';

    case ScheduleType.SPECIFIC_DATE:
      return schedule.specificDate || '';

    case ScheduleType.SPECIFIC_DATETIME:
      return schedule.specificDateTime || '';

    case ScheduleType.WEEKDAY:
      if (schedule.weekday !== undefined) {
        const weekdayName = getWeekdayName(schedule.weekday);
        return schedule.isRecurring ? `每${weekdayName}` : weekdayName;
      }
      return '';

    case ScheduleType.TIME_RANGE:
      if (schedule.startTime && schedule.endTime) {
        return `${schedule.startTime} - ${schedule.endTime}`;
      }
      return '';

    case ScheduleType.DATETIME_RANGE:
      if (schedule.startDateTime && schedule.endDateTime) {
        return `${schedule.startDateTime} - ${schedule.endDateTime}`;
      }
      return '';

    default:
      return schedule.description || '';
  }
}

/**
 * 获取TaskSchedule的简短显示文本（用于任务列表）
 * @param schedule TaskSchedule对象
 * @returns 简短的显示文本
 */
export function getScheduleShortText(schedule: TaskSchedule): string {
  const fullText = getScheduleDisplayText(schedule);

  switch (schedule.type) {
    case ScheduleType.SPECIFIC_DATETIME:
    case ScheduleType.DATETIME_RANGE:
      // 对于日期时间，只显示日期部分
      return fullText.split(' ')[0] || fullText;

    default:
      return fullText;
  }
}

/**
 * 创建"今天"类型的时间安排
 * @param description 可选的描述
 * @returns TaskSchedule对象
 */
export function createTodaySchedule(description?: string): TaskSchedule {
  const schedule = new TaskSchedule(ScheduleType.TODAY);
  schedule.description = description;
  return schedule;
}

/**
 * 创建"明天"类型的时间安排
 * @param description 可选的描述
 * @returns TaskSchedule对象
 */
export function createTomorrowSchedule(description?: string): TaskSchedule {
  const schedule = new TaskSchedule(ScheduleType.TOMORROW);
  schedule.description = description;
  return schedule;
}

/**
 * 创建特定日期的时间安排
 * @param date 日期字符串，格式: 2025-05-08
 * @param description 可选的描述
 * @returns TaskSchedule对象
 */
export function createSpecificDateSchedule(
  date: string,
  description?: string
): TaskSchedule {
  const schedule = new TaskSchedule(ScheduleType.SPECIFIC_DATE);
  schedule.specificDate = date;
  schedule.description = description;
  return schedule;
}

/**
 * 创建特定日期时间的时间安排
 * @param dateTime 日期时间字符串，格式: 2025-05-08 23:22:33
 * @param description 可选的描述
 * @returns TaskSchedule对象
 */
export function createSpecificDateTimeSchedule(
  dateTime: string,
  description?: string
): TaskSchedule {
  const schedule = new TaskSchedule(ScheduleType.SPECIFIC_DATETIME);
  schedule.specificDateTime = dateTime;
  schedule.description = description;
  return schedule;
}

/**
 * 创建周几的时间安排
 * @param weekday 周几 (0-6)
 * @param isRecurring 是否重复
 * @param description 可选的描述
 * @returns TaskSchedule对象
 */
export function createWeekdaySchedule(
  weekday: Weekday,
  isRecurring: boolean = false,
  description?: string
): TaskSchedule {
  const schedule = new TaskSchedule(ScheduleType.WEEKDAY);
  schedule.weekday = weekday;
  schedule.isRecurring = isRecurring;
  schedule.description = description;
  return schedule;
}

/**
 * 创建时间段的时间安排（同一天内）
 * @param startTime 开始时间，格式: 23:22:33
 * @param endTime 结束时间，格式: 23:22:33
 * @param description 可选的描述
 * @returns TaskSchedule对象
 */
export function createTimeRangeSchedule(
  startTime: string,
  endTime: string,
  description?: string
): TaskSchedule {
  const schedule = new TaskSchedule(ScheduleType.TIME_RANGE);
  schedule.startTime = startTime;
  schedule.endTime = endTime;
  schedule.description = description;
  return schedule;
}

/**
 * 创建日期时间段的时间安排（跨天）
 * @param startDateTime 开始日期时间，格式: 2025-05-08 23:22:33
 * @param endDateTime 结束日期时间，格式: 2025-05-09 23:22:33
 * @param description 可选的描述
 * @returns TaskSchedule对象
 */
export function createDateTimeRangeSchedule(
  startDateTime: string,
  endDateTime: string,
  description?: string
): TaskSchedule {
  const schedule = new TaskSchedule(ScheduleType.DATETIME_RANGE);
  schedule.startDateTime = startDateTime;
  schedule.endDateTime = endDateTime;
  schedule.description = description;
  return schedule;
}

/**
 * 解析时间字符串并创建相应的TaskSchedule
 * @param timeStr 时间字符串
 * @returns TaskSchedule对象或null
 */
export function parseScheduleFromString(timeStr: string): TaskSchedule | null {
  const trimmed = timeStr.trim().toLowerCase();

  // 特殊关键词
  if (trimmed === '今天' || trimmed === 'today') {
    return createTodaySchedule();
  }

  if (trimmed === '明天' || trimmed === 'tomorrow') {
    return createTomorrowSchedule();
  }

  // 周几关键词
  const weekdayMap: { [key: string]: Weekday } = {
    周一: Weekday.MONDAY,
    星期一: Weekday.MONDAY,
    monday: Weekday.MONDAY,
    mon: Weekday.MONDAY,
    周二: Weekday.TUESDAY,
    星期二: Weekday.TUESDAY,
    tuesday: Weekday.TUESDAY,
    tue: Weekday.TUESDAY,
    周三: Weekday.WEDNESDAY,
    星期三: Weekday.WEDNESDAY,
    wednesday: Weekday.WEDNESDAY,
    wed: Weekday.WEDNESDAY,
    周四: Weekday.THURSDAY,
    星期四: Weekday.THURSDAY,
    thursday: Weekday.THURSDAY,
    thu: Weekday.THURSDAY,
    周五: Weekday.FRIDAY,
    星期五: Weekday.FRIDAY,
    friday: Weekday.FRIDAY,
    fri: Weekday.FRIDAY,
    周六: Weekday.SATURDAY,
    星期六: Weekday.SATURDAY,
    saturday: Weekday.SATURDAY,
    sat: Weekday.SATURDAY,
    周日: Weekday.SUNDAY,
    星期日: Weekday.SUNDAY,
    sunday: Weekday.SUNDAY,
    sun: Weekday.SUNDAY,
  };

  for (const [key, weekday] of Object.entries(weekdayMap)) {
    if (trimmed.includes(key)) {
      const isRecurring = trimmed.includes('每') || trimmed.includes('every');
      return createWeekdaySchedule(weekday, isRecurring);
    }
  }

  // 尝试解析日期时间格式
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return createSpecificDateTimeSchedule(trimmed);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return createSpecificDateSchedule(trimmed);
  }

  // 尝试解析时间段
  if (trimmed.includes('-') || trimmed.includes('到')) {
    const separator = trimmed.includes('-') ? '-' : '到';
    const parts = trimmed.split(separator).map((p) => p.trim());

    if (parts.length === 2) {
      const [start, end] = parts;

      // 日期时间段
      if (
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(start) &&
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(end)
      ) {
        return createDateTimeRangeSchedule(start, end);
      }

      // 时间段
      if (
        /^\d{2}:\d{2}:\d{2}$/.test(start) &&
        /^\d{2}:\d{2}:\d{2}$/.test(end)
      ) {
        return createTimeRangeSchedule(start, end);
      }
    }
  }

  return null;
}

/**
 * 检查时间安排是否已过期
 * @param schedule TaskSchedule对象
 * @returns 是否已过期
 */
export function isScheduleExpired(schedule: TaskSchedule): boolean {
  const now = new Date();

  switch (schedule.type) {
    case ScheduleType.SPECIFIC_DATE:
      if (schedule.specificDate) {
        const date = parseDate(schedule.specificDate);
        if (date) {
          // 设置为当天结束时间进行比较
          date.setHours(23, 59, 59, 999);
          return now > date;
        }
      }
      break;

    case ScheduleType.SPECIFIC_DATETIME:
      if (schedule.specificDateTime) {
        const date = parseDateTime(schedule.specificDateTime);
        if (date) {
          return now > date;
        }
      }
      break;

    case ScheduleType.DATETIME_RANGE:
      if (schedule.endDateTime) {
        const date = parseDateTime(schedule.endDateTime);
        if (date) {
          return now > date;
        }
      }
      break;

    case ScheduleType.TODAY: {
      // 今天类型在当天结束时过期
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return now > today;
    }

    default:
      return false;
  }

  return false;
}
