/**
 * 全局任务状态管理器
 * 通过 afterChange 回调同步 store → Vue reactive ref
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

// 全局响应式状态 ref —— store 每次改动后调用 sync 更新
const globalStateRef = ref<any>(buildState());

function buildState(): any {
  return {
    editorMode: store.state.editorMode,
    taskState: store.state.taskState,
    selectedTaskId: store.manager.list.selected?.id,
    cursorPosition: store.state.cursorPosition,
    isHelpVisible: store.state.isHelpVisible,
    lastlineContent: store.state.lastlineContent,
    lastlineVisible: store.state.lastlineVisible,
    tasks: store.manager.list.items,
    maxId: store.manager.maxId,
    clipboard: store.manager.clipboard,
  };
}

// Store 每次修改后调用此函数
store.afterChange(() => {
    logger.debug('TaskStateManager', 'Ref synced', { tasks: store.manager.list.items.length });
  globalStateRef.value = buildState();
});

export function getGlobalStateRef() {
  return globalStateRef;
}

export function resetGlobalState(): void {
  isInit = false;
  logger.info('TaskStateManager', 'Global state reset');
}
