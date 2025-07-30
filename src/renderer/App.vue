<script setup lang="ts">
import ModeDebug from "./components/ModeDebug.vue";
import TodoList from "@components/TodoList.vue";
import LastLine from "@components/LastLine.vue";
import TaskConfig from "@components/TaskConfig.vue";
import HelpPanel from "@components/HelpPanel.vue";

import { onMounted, computed, ref } from "vue";
import { useTaskState } from "@composables/use-task-state";
import { EditorMode } from "@renderer/domain/editor";

const { taskDataManager, isHelpVisible, isTaskConfigVisible, selectedTask, editorMode } = useTaskState();

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
  return isTaskConfigVisible.value;
});

const hideTaskConfig = () => {
  taskDataManager.exitTaskConfig();
};

const handleTaskUpdate = (taskId: number, property: string, value: any) => {
  taskDataManager.updateTaskProperty(taskId, property, value);
};

const handleTaskConfigKeydown = (event: KeyboardEvent) => {
  // 将键盘事件传递给TaskConfig组件处理
  if (taskConfigRef.value && editorMode.value === EditorMode.TASK_CONFIG) {
    taskConfigRef.value.handleKeydown(event);
  }
};

onMounted(() => {
  // 设置为深色模式，像vim编辑器
  document.body.classList.add('dark');

  // 设置body可以接收焦点，用于键盘事件处理
  document.body.tabIndex = -1;
  document.body.style.outline = 'none';

  // 监听全局键盘事件，用于TaskConfig模式
  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;

    // 处理TASK_CONFIG模式的键盘事件（包括测试事件）
    if (editorMode.value === EditorMode.TASK_CONFIG) {
      // 如果事件来自输入框，不要处理，让输入框自己处理
      if (target?.tagName === 'INPUT' || target?.tagName === 'SELECT') {
        return;
      }

      handleTaskConfigKeydown(event);
    }
  });
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
