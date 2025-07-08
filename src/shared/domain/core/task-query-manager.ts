/**
 * 任务查询管理器
 * 负责任务的搜索、过滤、查询等功能
 */

import { Task } from '../task';
import { logger } from '../../../renderer/utils/logger';

export interface TaskQueryState {
  tasks: Task[];
  lastlineContent: string;
}

export class TaskQueryManager {
  constructor(private getState: () => TaskQueryState) {}

  /**
   * 获取过滤后的任务列表
   */
  get filteredTasks(): Task[] {
    const state = this.getState();
    const filter = state.lastlineContent;

    if (!filter || !filter.startsWith('/')) {
      return state.tasks;
    }

    const searchTerm = filter.slice(1); // 移除开头的 '/'
    if (searchTerm === '') {
      return state.tasks;
    }

    const filtered = state.tasks.filter(
      (task) =>
        task.title.includes(searchTerm) || task.content.includes(searchTerm)
    );

    logger.info(
      'TaskQueryManager',
      `Filtered ${filtered.length} tasks with term: ${searchTerm}`
    );
    return filtered;
  }

  /**
   * 检查是否正在搜索
   */
  get isSearching(): boolean {
    const state = this.getState();
    const filter = state.lastlineContent;
    return !!(filter && filter.startsWith('/') && filter.length > 1);
  }

  /**
   * 搜索任务
   */
  searchTasks(searchTerm: string): Task[] {
    const state = this.getState();

    if (!searchTerm) {
      return state.tasks;
    }

    const results = state.tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.tags?.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    logger.info(
      'TaskQueryManager',
      `Search for "${searchTerm}" returned ${results.length} results`
    );
    return results;
  }

  /**
   * 根据条件过滤任务
   */
  filterTasks(filters: {
    completed?: boolean;
    priority?: string;
    tags?: string[];
    hasContent?: boolean;
  }): Task[] {
    const state = this.getState();
    let filtered = [...state.tasks];

    if (filters.completed !== undefined) {
      filtered = filtered.filter(
        (task) => task.completed === filters.completed
      );
    }

    if (filters.priority) {
      filtered = filtered.filter((task) => task.priority === filters.priority);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((task) =>
        filters.tags!.some((tag) => task.tags?.includes(tag))
      );
    }

    if (filters.hasContent !== undefined) {
      filtered = filtered.filter((task) => {
        const hasContent = !!(task.content && task.content.trim());
        return hasContent === filters.hasContent;
      });
    }

    logger.info(
      'TaskQueryManager',
      `Applied filters, ${filtered.length} tasks remaining`
    );
    return filtered;
  }

  /**
   * 获取任务统计信息
   */
  getTaskStats(): {
    total: number;
    completed: number;
    pending: number;
    withContent: number;
    byPriority: Record<string, number>;
  } {
    const state = this.getState();
    const tasks = state.tasks;

    const stats = {
      total: tasks.length,
      completed: tasks.filter((t) => t.completed).length,
      pending: tasks.filter((t) => !t.completed).length,
      withContent: tasks.filter((t) => t.content && t.content.trim()).length,
      byPriority: {} as Record<string, number>,
    };

    // 统计优先级分布
    tasks.forEach((task) => {
      const priority = task.priority || 'MEDIUM';
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
    });

    return stats;
  }
}
