import { Schedule } from './schedule';

export class Task {
  id: number;
  title: string;
  content: string;
  completed: boolean;
  flagged: boolean;
  selected: boolean;
  status: TaskState;
  tags?: string[];
  priority?: TaskPriority;
  schedule?: Schedule;
  configState?: string;
  /** 最近一次数据变更时间戳（ms），供 :sort updated */
  updatedAt?: number;
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
    this.cursorLine = 0;
    this.cursorColumn = 0;
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
