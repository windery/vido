import { taskStore } from '../store/task';

export class Task {
  id: number;
  title: string;
  content: string;
  completed?: boolean;
  selected?: boolean;
  status?: TaskState;
  remind?: TaskRemind;

  constructor() {
    this.id = taskStore().genId();
    this.title = '';
    this.content = '';
    this.selected = false;
    this.status = TaskState.VIEWING;
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
  EDITING,
}
