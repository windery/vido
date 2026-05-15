import { Schedule } from './schedule';

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
  schedule?: Schedule;
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
