/**
 * 数据持久化管理器
 * 负责任务数据的保存和加载到 .vido/data/ 目录
 */

import { Task } from '../task';
import { TaskDataState } from './task-data-manager';
import { logger } from '../../../renderer/utils/logger';
import { saveJsonFile, loadJsonFile } from '../../utils/file-operations-ipc';

export class DataPersistence {
  constructor(
    private getState: () => TaskDataState,
    private updateState: (updates: Partial<TaskDataState>) => void
  ) {}

  /**
   * 保存任务到 JSON 文件
   */
  async saveTasks(): Promise<void> {
    try {
      const state = this.getState();
      const tasksToSave = state.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        content: task.content,
        completed: task.completed,
        priority: task.priority,
        tags: task.tags,
        schedule: task.schedule,
        // 不保存运行时状态
      }));

      // 保存任务数据和元数据
      const dataToSave = {
        tasks: tasksToSave,
        maxId: state.maxId,
        version: '1.0.0',
        lastModified: new Date().toISOString(),
      };

      await saveJsonFile('tasks.json', dataToSave);
      logger.info(
        'DataPersistence',
        `Saved ${tasksToSave.length} tasks to JSON file`
      );
    } catch (error) {
      logger.error('DataPersistence', 'Failed to save tasks', { error });
    }
  }

  /**
   * 从 JSON 文件加载任务
   */
  async loadTasks(): Promise<void> {
    try {
      const savedData = await loadJsonFile('tasks.json');

      if (savedData && savedData.tasks) {
        const tasksData = savedData.tasks;
        const tasks: Task[] = tasksData.map((taskData: any) => {
          const task = new Task(taskData.id);
          task.title = taskData.title || '';
          task.content = taskData.content || '';
          task.completed = taskData.completed || false;
          task.priority = taskData.priority;
          task.tags = taskData.tags || [];
          task.schedule = taskData.schedule || undefined;
          return task;
        });

        const maxId =
          savedData.maxId || Math.max(...tasks.map((t) => t.id), 0) + 1;

        this.updateState({
          tasks,
          maxId,
        });

        logger.info(
          'DataPersistence',
          `Loaded ${tasks.length} tasks from JSON file (version: ${savedData.version || 'unknown'})`
        );
      } else {
        logger.info(
          'DataPersistence',
          'No saved tasks found, starting with empty list'
        );
      }
    } catch (error) {
      logger.error('DataPersistence', 'Failed to load tasks', { error });
    }
  }
}
