/**
 * 统一入口——组合 task / editor / action
 */

import { useTaskList } from './use-task-list';
import { useTaskStateGetters } from './use-task-state-getters';
import { useTaskSelection } from './use-task-selection';
import { useTaskActions } from './use-task-actions';
import { useEditingModes } from './use-editing-modes';
import { useCursor } from './use-cursor';
import { getTaskDataManager } from './task-state-manager';

export function useTaskState() {
  return {
    ...useTaskList(),
    ...useTaskStateGetters(),
    ...useTaskSelection(),
    ...useTaskActions(),
    ...useEditingModes(),
    ...useCursor(),
    taskDataManager: getTaskDataManager(),
  };
}
