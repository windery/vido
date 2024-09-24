import { defineStore } from 'pinia';
import { Task, TaskState } from '../domain/task';
import { lastlineStore } from './lastline';

export const taskStore = defineStore('tasks', {
  state: () => ({
    maxId: 1,
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
        status: TaskState.VIEWING,
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
        status: TaskState.VIEWING,
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
        status: TaskState.VIEWING,
      },
    ] as Task[],
    NON_EXIST_TASK: {} as Task,
  }),
  getters: {
    // 计算属性，返回已完成的任务
    filteredTasks: (state) => {
      const filter = lastlineStore().content;
      if (!filter || filter === '') {
        return state.tasks;
      }
      return state.tasks.filter(
        (task) => task.title.includes(filter) || task.content.includes(filter)
      );
    },
    selectedTask: (state): Task => {
      const selected = state.tasks.find((task) => task.selected);
      if (selected) {
        console.debug(`selectedTask is ${selected.id} - ${selected.title}`);
        return selected;
      } else {
        console.debug(`selected task is none`);
        return state.NON_EXIST_TASK;
      }
    },
  },
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
            task.status = TaskState.VIEWING;
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
              console.debug('nextTask', nextTask);
            } else {
              console.debug('nextTask is undefined');
            }
          }
        });
        if (!found) {
          this.tasks[0].selected = true;
          this.tasks[0].status = TaskState.SELECTED;
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
            task.status = TaskState.VIEWING;
            if (index > 0) {
              previousTask = this.tasks[index - 1];
              found = true;
            } else if (index == 0) {
              previousTask = this.tasks[this.tasks.length - 1];
              found = true;
            }
            if (previousTask) {
              console.debug('previousTask', previousTask);
              previousTask.selected = true;
              previousTask.status = TaskState.SELECTED;
            } else {
              console.debug('previousTask is undefined');
            }
          }
        });
        if (!found) {
          this.tasks[0].selected = true;
          this.tasks[0].status = TaskState.SELECTED;
        }
      }
    },
    startEditing() {
      this.tasks.forEach((task) => {
        task.status = TaskState.VIEWING;
      });
      if (this.selectedTask) {
        console.log(
          `task ${this.selectedTask.id} - ${this.selectedTask.title} start editing`
        );
        this.selectedTask.status = TaskState.EDITING;
      }
    },
    stopEditing() {
      if (this.selectedTask) {
        console.log(
          `task ${this.selectedTask.id} - ${this.selectedTask.title} stop editing`
        );
        this.selectedTask.status = TaskState.VIEWING;
      }
    },
    triggerSelectedCompletion() {
      const selectedTask = this.selectedTask;
      if (selectedTask) {
        console.log(`change task ${selectedTask.id} completion`);
        selectedTask.completed = !selectedTask.completed;
      }
    },
  },
});
