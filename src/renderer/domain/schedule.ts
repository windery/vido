import {
  formatDate,
  formatDateTime,
  getWeekdayName,
  parseDate,
} from '@utils/date-formatter';

export class Schedule {
  type?: ScheduleType;
  quickTime?: ScheduleQuickTime;
  weeklyTime?: ScheduleWeeklyTime;
  rangeTime?: ScheduleRangeTime;

  constructor(
    type: ScheduleType,
    quickTime?: ScheduleQuickTime,
    weeklyTime?: ScheduleWeeklyTime,
    rangeTime?: ScheduleRangeTime
  ) {
    this.type = type;
    this.quickTime = quickTime;
    this.weeklyTime = weeklyTime;
    this.rangeTime = rangeTime;
  }

  getScheduleDisplayText(): string {
    if (!this.type) {
      return '';
    }

    switch (this.type) {
      case ScheduleType.QUICK:
        return this.getQuickTimeDisplayText();
      case ScheduleType.WEEKLY:
        return this.getWeeklyTimeDisplayText();
      case ScheduleType.RANGE:
        return this.getRangeTimeDisplayText();
      default:
        return '';
    }
  }

  private getQuickTimeDisplayText(): string {
    if (this.type === ScheduleType.QUICK && this.quickTime) {
      const quickTime = this.quickTime;
      if (quickTime.time instanceof Date) {
        return formatDateTime(quickTime.time);
      }
      return '';
    }
    return '';
  }

  private getWeeklyTimeDisplayText(): string {
    if (this.type === ScheduleType.WEEKLY && this.weeklyTime) {
      const days = this.weeklyTime.days;
      if (days && days.length > 0) {
        return days.map((day) => getWeekdayName(day)).join(', ');
      }
    }
    return '';
  }

  private getRangeTimeDisplayText(): string {
    if (this.type === ScheduleType.RANGE && this.rangeTime) {
      const rangeTime = this.rangeTime;
      return `${formatDate(parseDate(rangeTime.startDateTime) as Date)} ~ ${formatDate(parseDate(rangeTime.endDateTime) as Date)}`;
    }
    return '';
  }
}

export interface ScheduleQuickTime {
  time: Date;
}

export interface ScheduleWeeklyTime {
  days?: Weekday[];
}

export interface ScheduleRangeTime {
  startDateTime: string;
  endDateTime: string;
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

export enum ScheduleType {
  QUICK = 'quick',
  TIME = 'time',
  WEEKLY = 'weekly',
  RANGE = 'range',
}