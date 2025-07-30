/**
 * 全局任务状态管理器
 * 负责管理TaskDataManager实例和全局状态同步
 */

import { ref } from 'vue';
import { TaskDataManager } from '../domain/core/task-data-manager';
import { logger } from '../utils/logger';

// 全局单例实例
let globalTaskDataManager: TaskDataManager | null = null;
let globalStateRef: any = null;
let isObserverSetup = false;

/**
 * 获取全局TaskDataManager实例
 */
export function getTaskDataManager(): TaskDataManager {
  if (!globalTaskDataManager) {
    globalTaskDataManager = new TaskDataManager();

    // 异步加载数据
    globalTaskDataManager.loadTasks().catch((error) => {
      logger.error('TaskStateManager', 'Failed to load tasks', { error });
    });

    logger.info('TaskStateManager', 'TaskDataManager instance created');
  }
  return globalTaskDataManager;
}

/**
 * 获取全局响应式状态引用
 */
export function getGlobalStateRef() {
  const taskDataManager = getTaskDataManager();

  if (!globalStateRef) {
    globalStateRef = ref(taskDataManager.getTaskDataState());
    logger.info('TaskStateManager', 'Global state ref created');
  }

  // 设置观察者（只设置一次）
  if (!isObserverSetup) {
    taskDataManager.subscribe({
      update: (event: any) => {
        globalStateRef.value = taskDataManager.getTaskDataState();
        logger.info('TaskStateManager', `State updated: ${event.type}`);
      },
    });
    isObserverSetup = true;
    logger.info('TaskStateManager', 'Observer setup completed');
  }

  return globalStateRef;
}

/**
 * 重置全局状态（用于测试）
 */
export function resetGlobalState() {
  globalTaskDataManager = null;
  globalStateRef = null;
  isObserverSetup = false;
  logger.info('TaskStateManager', 'Global state reset');
}
