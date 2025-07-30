/**
 * 任务状态获取器 Composable
 * 提供所有响应式状态的 getter 方法
 */

import { computed } from 'vue';
import { Task } from '../domain/task';
import { getGlobalStateRef } from './task-state-manager';

export function useTaskStateGetters() {
  const stateRef = getGlobalStateRef();

  // ============ 基础状态 ============
  const tasks = computed(() => stateRef.value.tasks);

  const selectedTask = computed(
    () => stateRef.value.tasks.find((task: Task) => task.selected) || null
  );

  const selectedTaskIndex = computed(() =>
    stateRef.value.tasks.findIndex((task: Task) => task.selected)
  );

  // ============ 搜索和过滤 ============
  const filteredTasks = computed(() => {
    const filter = stateRef.value.lastlineContent;
    if (!filter || filter === '' || !filter.startsWith('/')) {
      return stateRef.value.tasks;
    }
    const searchTerm = filter.slice(1);
    if (searchTerm === '') {
      return stateRef.value.tasks;
    }
    return stateRef.value.tasks.filter(
      (task: Task) =>
        task.title.includes(searchTerm) || task.content.includes(searchTerm)
    );
  });

  const isSearching = computed(() => {
    const filter = stateRef.value.lastlineContent;
    return !!(filter && filter.startsWith('/') && filter.length > 1);
  });

  // ============ 编辑器状态 ============
  const editorMode = computed(() => stateRef.value.editorMode);
  const taskState = computed(() => stateRef.value.taskState);
  const cursorPosition = computed(() => stateRef.value.cursorPosition);

  // ============ 界面状态 ============
  const lastlineContent = computed(() => stateRef.value.lastlineContent || '');
  const lastlineVisible = computed(
    () => stateRef.value.lastlineVisible || false
  );
  const isHelpVisible = computed(() => stateRef.value.isHelpVisible || false);
  const isTaskConfigVisible = computed(
    () => stateRef.value.isTaskConfigVisible || false
  );

  return {
    // 基础状态
    tasks,
    selectedTask,
    selectedTaskIndex,

    // 搜索和过滤
    filteredTasks,
    isSearching,

    // 编辑器状态
    editorMode,
    taskState,
    cursorPosition,

    // 界面状态
    lastlineContent,
    lastlineVisible,
    isHelpVisible,
    isTaskConfigVisible,
  };
}
