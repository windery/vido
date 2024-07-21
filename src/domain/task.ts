import { taskStore } from '../store/task';

export class Task {
  id: number;
  title: string;
  content: string;
  completed?: boolean;
  selected?: boolean;
  remind?: TaskRemind;

  constructor() {
    this.id = taskStore().genId();
    this.title = '';
    this.content = '';
    this.selected = false;
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
