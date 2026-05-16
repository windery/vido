import {
  formatDate,
  formatDateTime,
  getWeekdayName,
} from '../utils/date-formatter';

export enum ScheduleType {
  QUICK = 'quick',
  TIME = 'time',
  WEEKLY = 'weekly',
  RANGE = 'range',
}

export enum Weekday {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

export interface ScheduleQuickTime {
  date?: string;
  time?: string;
}

export interface ScheduleWeeklyTime {
  days: Weekday[];
  recurring?: boolean;
}

export interface ScheduleRangeTime {
  startDateTime: string;
  endDateTime: string;
}

export class Schedule {
  type: ScheduleType;
  quickTime?: ScheduleQuickTime;
  weeklyTime?: ScheduleWeeklyTime;
  rangeTime?: ScheduleRangeTime;

  constructor(
    type: ScheduleType,
    opts?: {
      quickTime?: ScheduleQuickTime;
      weeklyTime?: ScheduleWeeklyTime;
      rangeTime?: ScheduleRangeTime;
    }
  ) {
    this.type = type;
    this.quickTime = opts?.quickTime;
    this.weeklyTime = opts?.weeklyTime;
    this.rangeTime = opts?.rangeTime;
  }

  getDisplayText(): string {
    switch (this.type) {
      case ScheduleType.QUICK:
        return this.getQuickDisplayText();
      case ScheduleType.TIME:
        return this.getTimeDisplayText();
      case ScheduleType.WEEKLY:
        return this.getWeeklyDisplayText();
      case ScheduleType.RANGE:
        return this.getRangeDisplayText();
      default:
        return '';
    }
  }

  getShortText(): string {
    const full = this.getDisplayText();
    // 对于含时间的类型，只显示日期部分
    if (this.type === ScheduleType.TIME || this.type === ScheduleType.RANGE) {
      return full.split(' ')[0] || full;
    }
    return full;
  }

  private getQuickDisplayText(): string {
    const qt = this.quickTime;
    if (!qt) return '';
    if (qt.date) return qt.date;
    if (qt.time) {
      const d = new Date(qt.time);
      return isNaN(d.getTime()) ? qt.time : formatDate(d);
    }
    return '';
  }

  private getTimeDisplayText(): string {
    if (this.quickTime?.time) {
      const d = new Date(this.quickTime.time);
      return isNaN(d.getTime())
        ? this.quickTime.time
        : formatDateTime(d);
    }
    return '';
  }

  private getWeeklyDisplayText(): string {
    const wt = this.weeklyTime;
    if (!wt?.days?.length) return '';
    const names = wt.days.map((d) => getWeekdayName(d)).join(', ');
    return wt.recurring ? `每${names}` : names;
  }

  private getRangeDisplayText(): string {
    const rt = this.rangeTime;
    if (!rt) return '';
    const fmt = (s: string) => {
      const d = new Date(s);
      return isNaN(d.getTime()) ? s : formatDateTime(d);
    };
    const startStr = rt.startDateTime ? fmt(rt.startDateTime) : '';
    const endStr = rt.endDateTime ? fmt(rt.endDateTime) : '';
    if (startStr && endStr) return `${startStr} - ${endStr}`;
    if (startStr) return startStr;
    if (endStr) return endStr;
    return '';
  }
}
