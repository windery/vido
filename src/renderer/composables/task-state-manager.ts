/**
 * 全局任务状态管理器
 * 基于 DDD store + TaskListManager
 */

import { ref } from 'vue';
import { store, Store } from '../domain/state/store';
import { logger } from '../utils/logger';

export { store };

let isInit = false;

export function getTaskDataManager(): Store {
  if (!isInit) {
    store.init().catch((e) => logger.error('TaskStateManager', 'Failed to load tasks', { error: e }));
    isInit = true;
  }
  return store;
}

let globalStateRef: any = null;

export function getGlobalStateRef() {
  if (!globalStateRef) {
    globalStateRef = ref({
      ...store.state,
      tasks: store.manager.list.items,
      maxId: store.manager.maxId,
      clipboard: store.manager.clipboard,
    });
    logger.info('TaskStateManager', 'Global state ref created');
  }

  const tasks = store.manager.list.items;
  const maxId = store.manager.maxId;
  const clipboard = store.manager.clipboard;
  globalStateRef.value = {
    ...store.state,
    tasks,
    maxId,
    clipboard,
  };

  return globalStateRef;
}

export function resetGlobalState(): void {
  globalStateRef = null;
  isInit = false;
  logger.info('TaskStateManager', 'Global state reset');
}
