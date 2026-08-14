/**
 * 编辑器 + UI 状态 getter
 * 关注编辑器模式和界面状态，不包含 TaskList 数据（已移至 use-task-list.ts）
 */

import { computed } from 'vue';
import { getGlobalStateRef } from './task-state-manager';

export function useTaskStateGetters() {
  const stateRef = getGlobalStateRef();

  return {
    editorMode: computed(() => stateRef.value.editorMode),
    taskState: computed(() => stateRef.value.taskState),
    cursorPosition: computed(() => stateRef.value.cursorPosition),
    lastlineContent: computed(() => stateRef.value.lastlineContent || ''),
    lastlineVisible: computed(() => stateRef.value.lastlineVisible || false),
    isHelpVisible: computed(() => stateRef.value.isHelpVisible || false),
    flashMessage: computed(() => stateRef.value.flashMessage || null),
    tagDeleteIndex: computed(() => stateRef.value.tagDeleteIndex || 0),
    configNavIndex: computed(() => stateRef.value.configNavIndex || 0),
    dirty: computed(() => !!stateRef.value.dirty),
    calendarVisible: computed(() => !!stateRef.value.calendarView?.visible),
  };
}
