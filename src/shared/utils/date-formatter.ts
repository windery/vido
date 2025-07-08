/**
 * 统一的时间格式化工具
 * 所有时间显示都使用友好格式: 2025-05-08 23:22:33
 */

/**
 * 将Date对象格式化为友好的日期时间字符串
 * @param date Date对象
 * @returns 格式化后的字符串，如: "2025-05-08 23:22:33"
 */
export function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 将Date对象格式化为友好的日期字符串
 * @param date Date对象
 * @returns 格式化后的字符串，如: "2025-05-08"
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 将Date对象格式化为友好的时间字符串
 * @param date Date对象
 * @returns 格式化后的字符串，如: "23:22:33"
 */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

/**
 * 解析友好格式的日期时间字符串为Date对象
 * @param dateTimeStr 格式如: "2025-05-08 23:22:33"
 * @returns Date对象，解析失败返回null
 */
export function parseDateTime(dateTimeStr: string): Date | null {
  try {
    // 支持多种格式
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateTimeStr)) {
      // 完整日期时间格式: 2025-05-08 23:22:33
      const date = new Date(dateTimeStr.replace(' ', 'T'));
      return isNaN(date.getTime()) ? null : date;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateTimeStr)) {
      // 日期格式: 2025-05-08
      const date = new Date(dateTimeStr + 'T00:00:00');
      return isNaN(date.getTime()) ? null : date;
    }

    if (/^\d{2}:\d{2}:\d{2}$/.test(dateTimeStr)) {
      // 时间格式: 23:22:33 (使用今天的日期)
      const today = new Date();
      const todayStr = formatDate(today);
      const date = new Date(`${todayStr}T${dateTimeStr}`);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 解析友好格式的日期字符串为Date对象
 * @param dateStr 格式如: "2025-05-08"
 * @returns Date对象，解析失败返回null
 */
export function parseDate(dateStr: string): Date | null {
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const date = new Date(dateStr + 'T00:00:00');
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 获取当前时间的友好格式字符串
 * @returns 当前时间，如: "2025-05-08 23:22:33"
 */
export function getCurrentDateTime(): string {
  return formatDateTime(new Date());
}

/**
 * 获取当前日期的友好格式字符串
 * @returns 当前日期，如: "2025-05-08"
 */
export function getCurrentDate(): string {
  return formatDate(new Date());
}

/**
 * 获取明天日期的友好格式字符串
 * @returns 明天日期，如: "2025-05-09"
 */
export function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDate(tomorrow);
}

/**
 * 周几的中文名称映射
 */
export const WEEKDAY_NAMES = {
  0: '周日',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
} as const;

/**
 * 获取周几的中文名称
 * @param weekday 周几的数字(0-6)
 * @returns 中文名称，如: "周一"
 */
export function getWeekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday as keyof typeof WEEKDAY_NAMES] || '未知';
}
