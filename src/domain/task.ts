class Task {
  id: number;
  title: string;
  content: string;
  completed?: boolean;

  constructor(id: number, title: string, content: string, completed?: boolean) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.completed = completed;
  }
}
