import { computed } from 'vue';
import { Task } from '../domain/task';
import { taskMatchesSearch } from '../domain/entities/task-list';
import { getGlobalStateRef } from './task-state-manager';

export function useTaskList() {
  const stateRef = getGlobalStateRef();

  return {
    tasks: computed(() => stateRef.value.tasks),
    selectedTask: computed<Task | null>(() =>
      stateRef.value.tasks.find((t: Task) => t.selected) || null
    ),
    filteredTasks: computed(() => {
      const filter = stateRef.value.lastlineContent;
      if (!filter || !filter.startsWith('/')) return stateRef.value.tasks;
      const term = filter.slice(1);
      return term ? stateRef.value.tasks.filter((t: Task) => taskMatchesSearch(t, term)) : stateRef.value.tasks;
    }),
    isSearching: computed(() => {
      const f = stateRef.value.lastlineContent;
      return !!(f && f.startsWith('/') && f.length > 1);
    }),
  };
}

