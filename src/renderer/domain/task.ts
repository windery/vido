export class Task {
  id: number;
  title: string;
  content: string;
  completed?: boolean;
  selected?: boolean;
  status?: TaskState;
  remind?: TaskRemind;
  tags?: string[];
  priority?: TaskPriority;
  schedule?: TaskSchedule;
  isNewlyCreated?: boolean;
  cursorLine?: number;
  cursorColumn?: number;

  constructor(id?: number) {
    this.id = id || 0;
    this.title = '';
    this.content = '';
    this.selected = false;
    this.status = TaskState.VIEWING;
    this.tags = [];
    this.priority = TaskPriority.MEDIUM;
    this.completed = false;
    this.isNewlyCreated = false;
    this.cursorLine = 0;
    this.cursorColumn = 0;
  }
}

export class TaskRemind {
  date: Date;
  location?: string;
  repeat?: boolean;

  constructor(date: Date, repeat: boolean) {
    this.date = date;
    this.repeat = repeat;
  }
}

export class TaskSchedule {
  type: ScheduleType;
  specificDate?: string; // 格式: 2025-05-08
  specificDateTime?: string; // 格式: 2025-05-08 23:22:33
  weekday?: Weekday; // 周几
  startTime?: string; // 格式: 23:22:33
  endTime?: string; // 格式: 23:22:33
  startDateTime?: string; // 格式: 2025-05-08 23:22:33
  endDateTime?: string; // 格式: 2025-05-08 23:22:33
  isRecurring?: boolean; // 是否重复
  description?: string; // 时间描述

  constructor(type: ScheduleType) {
    this.type = type;
    this.isRecurring = false;
  }
}

export enum ScheduleType {
  NONE = 'none', // 无时间安排
  TODAY = 'today', // 今天
  TOMORROW = 'tomorrow', // 明天
  SPECIFIC_DATE = 'specific_date', // 特定日期
  SPECIFIC_DATETIME = 'specific_datetime', // 特定日期时间
  WEEKDAY = 'weekday', // 每周的某一天
  TIME_RANGE = 'time_range', // 时间段（同一天内）
  DATETIME_RANGE = 'datetime_range', // 日期时间段（跨天）
}

export enum Weekday {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 0,
}

export enum TaskState {
  VIEWING,
  SELECTED,
  CONTENT_NAVIGATION,
  TITLE_EDITING,
  CONTENT_EDITING,
}

export enum TaskPriority {
  LOW = 'P3',
  MEDIUM = 'P2',
  HIGH = 'P1',
}
