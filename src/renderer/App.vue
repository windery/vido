<script setup lang="ts">
import ModeDebug from "./components/ModeDebug.vue";
import TodoList from "@components/TodoList.vue";
import LastLine from "@components/LastLine.vue";
import HelpPanel from "@components/HelpPanel.vue";

import { onMounted, computed } from "vue";
import { useTaskState } from "@composables/use-task-state";

const { isHelpVisible } = useTaskState();

// 使用响应式的帮助状态
const showHelp = computed(() => {
  return isHelpVisible.value;
});

const hideHelp = () => {
  const { taskDataManager } = useTaskState();
  taskDataManager.toggleHelp();
};

onMounted(() => {
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
  background: var(--bg);
  color: var(--text);
}

.app {
  height: 100vh;
  width: 100vw;
  max-width: 100vw;
  display: flex;
  flex-direction: column;
  background: var(--bg);
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

/* Re-enable pointer events only for input elements and header action buttons */
input,
textarea {
  pointer-events: auto !important;
}

.hdr-btn {
  pointer-events: auto !important;
  cursor: pointer !important;
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
