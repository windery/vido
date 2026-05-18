import { computed } from 'vue';
import { store } from '../domain/state/store';
import { getGlobalStateRef } from './task-state-manager';

export function useTaskList() {
  const stateRef = getGlobalStateRef();

  return {
    tasks: computed(() => {
      void stateRef.value; // 依赖触发
      return store.manager.list.items;
    }),
    selectedTask: computed(() => {
      void stateRef.value;
      return store.manager.list.selected;
    }),
    filteredTasks: computed(() => {
      void stateRef.value;
      return store.manager.list.all;
    }),
    isSearching: computed(() => {
      void stateRef.value;
      return store.manager.list.isSearching;
    }),
  };
}
