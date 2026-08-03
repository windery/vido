import { Schedule } from './schedule';

export class Task {
  id: number;
  title: string;
  content: string;
  completed: boolean;
  flagged: boolean;
  selected: boolean;
  status: TaskState;
  remind?: TaskRemind;
  tags?: string[];
  priority?: TaskPriority;
  schedule?: Schedule;
  configState?: string;
  isNewlyCreated?: boolean;
  /** 剪贴板任务保留原始任务 id，供 paste 日志记录来源 */
  sourceId?: number;
  cursorLine: number;
  cursorColumn: number;

  constructor(id?: number) {
    this.id = id || 0;
    this.title = '';
    this.content = '';
    this.selected = false;
    this.status = TaskState.VIEWING;
    this.tags = [];
    this.priority = undefined;
    this.completed = false;
    this.flagged = false;
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
