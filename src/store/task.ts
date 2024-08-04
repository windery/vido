import { defineStore } from 'pinia';
import { Task } from '../domain/task';

export const taskStore = defineStore('tasks', {
  state: () => ({
    maxId: 1,
    // tasks: [] as Task[],
    tasks: [
      {
        id: 1,
        title: 'Task 1',
        content: 'Content 1',
        completed: false,
        remind: {
          date: new Date(),
          repeat: false,
        },
        selected: false,
      },
      {
        id: 2,
        title: 'Task 2',
        content: 'Content 2',
        completed: false,
        remind: {
          date: new Date(),
          repeat: false,
        },
        selected: false,
      },
    ] as Task[],
    filteredTasks: [] as Task[],
  }),
  actions: {
    genId() {
      return this.maxId++;
    },
    addTask(task: Task) {
      this.tasks.push(task);
    },
    removeTask(taskId: number) {
      this.tasks = this.tasks.filter((task) => task.id !== taskId);
    },
    selectTask(taskId: number) {
      this.tasks.forEach((task) => {
        task.selected = task.id === taskId;
      });
    },
    selectNext() {
      let found = false;
      this.tasks.forEach((task, index) => {
        if (task.selected) {
          if (index < this.tasks.length - 1) {
            task.selected = false;
            this.tasks[index + 1].selected = true;
            found = true;
          }
        }
      });
      if (!found && this.tasks.length > 0) {
        this.tasks[0].selected = true;
      }
    },
    selectPrevious() {
      let found = false;
      this.tasks.forEach((task, index) => {
        if (task.selected) {
          if (index > 0) {
            task.selected = false;
            this.tasks[index - 1].selected = true;
            found = true;
          }
        }
      });
      if (!found && this.tasks.length > 0) {
        this.tasks[0].selected = true;
      }
    },
  },
});
