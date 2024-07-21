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
        selected: true,
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
  },
});
