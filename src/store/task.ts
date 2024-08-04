import { defineStore } from 'pinia';
import { Task, TaskState } from '../domain/task';

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
      {
        id: 3,
        title: 'Task 3',
        content: 'Content 3',
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
      let nextTask: Task | undefined;
      let found = false;
      if (this.tasks.length > 0) {
        this.tasks.forEach((task, index) => {
          if (task.selected && !found) {
            task.selected = false;
            task.status = TaskState.NORMAL;
            if (index < this.tasks.length - 1) {
              nextTask = this.tasks[index + 1];
              found = true;
            } else {
              nextTask = this.tasks[0];
              found = true;
            }
            if (nextTask) {
              nextTask.selected = true;
              nextTask.status = TaskState.SELECTED;
            }
          }
        });
        if (!found) {
          this.tasks[0].selected = true;
        }
      }
    },
    selectPrevious() {
      let found = false;
      let previousTask: Task | undefined; // Initialize previousTask to undefined

      if (this.tasks.length > 0) {
        this.tasks.forEach((task, index) => {
          if (task.selected && !found) {
            task.selected = false;
            task.status = TaskState.NORMAL;
            if (index > 0) {
              previousTask = this.tasks[index - 1];
              found = true;
            } else if (index == 0) {
              previousTask = this.tasks[this.tasks.length - 1];
              found = true;
            }
            if (previousTask) {
              console.log('previousTask', previousTask);
              previousTask.selected = true;
              previousTask.status = TaskState.SELECTED;
            } else {
              console.log('previousTask is undefined');
            }
          }
        });
        if (!found) {
          this.tasks[0].selected = true;
        }
      }
    },
    getSelectedTask() {
      return this.tasks.find((task) => task.selected);
    },
    startEditing() {
      this.tasks.forEach((task) => {
        task.status = TaskState.NORMAL;
      });
      const selectedTask = this.getSelectedTask();
      console.log('selectedTask', selectedTask);
      if (selectedTask) {
        console.log(
          `task ${selectedTask.id} - ${selectedTask.title} start editing`
        );
        selectedTask.status = TaskState.EDITING;
      }
    },
  },
});
