<script setup lang="ts">
import ModeDebug from "./components/ModeDebug.vue";
import TodoList from "@components/TodoList.vue";
import LastLine from "@components/LastLine.vue";
import TaskConfig from "@components/TaskConfig.vue";
import HelpPanel from "@components/HelpPanel.vue";

import { onMounted, computed, ref } from "vue";
import { useTaskState } from "@composables/use-task-state";

const { taskDataManager, isHelpVisible, selectedTask } = useTaskState();

// TaskConfig组件的引用
const taskConfigRef = ref();

// 使用响应式的帮助状态
const showHelp = computed(() => {
  return isHelpVisible.value;
});

const hideHelp = () => {
  taskDataManager.toggleHelp();
};

// 使用响应式的任务配置状态
const showTaskConfig = computed(() => {
  return selectedTask.value?.isConfigExpanded || false;
});

const hideTaskConfig = () => {
  taskDataManager.closeConfigPanel();
};

const handleTaskUpdate = (taskId: number, property: string, value: any) => {
  taskDataManager.updateTaskProperty(taskId, property, value);
};

onMounted(() => {
  // 设置为深色模式，像vim编辑器
  document.body.classList.add('dark');

  // 设置body可以接收焦点，用于键盘事件处理
  document.body.tabIndex = -1;
  document.body.style.outline = 'none';
});
</script>

<template>
  <div class="app">
    <ModeDebug />
    <TodoList />
    <LastLine />

    <!-- Help Panel -->
    <HelpPanel :visible="showHelp" @close="hideHelp" />

    <!-- Task Configuration Panel -->
    <TaskConfig ref="taskConfigRef" :visible="showTaskConfig" :task="selectedTask" @close="hideTaskConfig"
      @update-task="handleTaskUpdate" />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace;
  background: #1e1e1e;
  color: #d4d4d4;
}

.app {
  height: 100vh;
  width: 100vw;
  max-width: 100vw;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  overflow: hidden;
  box-sizing: border-box;
  padding: 8px;
  margin: 0;
  pointer-events: auto;
}

/* Disable mouse cursor and interactions globally */
* {
  cursor: none !important;
  pointer-events: none !important;
}

/* Re-enable pointer events only for input elements when in edit mode */
input,
textarea {
  pointer-events: auto !important;
}

/* NOTE: Removed hover style overrides to prevent white background issues */

/* Global scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #2d2d2d;
}

::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #4f4f4f;
}

/* Help Panel styles moved to HelpPanel.vue */
</style>
