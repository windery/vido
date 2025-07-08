<script setup lang="ts">
import ModeDebug from "./components/ModeDebug.vue";
import TodoList from "./components/TodoList.vue";
import LastLine from "./components/LastLine.vue";
import TaskConfig from "./components/TaskConfig.vue";

import { onMounted, computed, ref } from "vue";
import { useTaskState } from "./composables/use-task-state";
import { EditorMode } from "../shared/domain/editor";

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
    <div v-if="showHelp" class="help-overlay" @click="hideHelp">
      <div class="help-panel" @click.stop>
        <div class="help-header">
          <h2>Vido - Vim-style Todo Manager</h2>
        </div>
        <div class="help-content">
          <div class="help-section">
            <h3>NORMAL MODE</h3>
            <div class="help-commands">
              <div class="help-command"><span class="key">j/k</span> Navigate up/down</div>
              <div class="help-command"><span class="key">Enter</span> Edit task title</div>
              <div class="help-command"><span class="key">i</span> Content navigation mode</div>
              <div class="help-command"><span class="key">Space</span> Toggle completion</div>
              <div class="help-command"><span class="key">o</span> New task below</div>
              <div class="help-command"><span class="key">O</span> New task above</div>
              <div class="help-command"><span class="key">dd</span> Delete task</div>
              <div class="help-command"><span class="key">yy</span> Copy task</div>
              <div class="help-command"><span class="key">p</span> Paste task</div>
              <div class="help-command"><span class="key">gg</span> Go to first task</div>
              <div class="help-command"><span class="key">G</span> Go to last task</div>
              <div class="help-command"><span class="key">/</span> Search tasks</div>
              <div class="help-command"><span class="key">:</span> Enter command mode</div>
              <div class="help-command"><span class="key">cc</span> Configure task (schedule/priority/tags)</div>
              <div class="help-command"><span class="key">?</span> Show/hide this help</div>
            </div>
          </div>

          <div class="help-section">
            <h3>COMMANDS</h3>
            <div class="help-commands">
              <div class="help-command"><span class="key">:help</span> Show help</div>
              <div class="help-command"><span class="key">:sort [type]</span> Sort tasks
                (title|priority|dueDate|created)</div>
              <div class="help-command"><span class="key">:new [title]</span> Create new task</div>
              <div class="help-command"><span class="key">:delete</span> Delete current task</div>
              <div class="help-command"><span class="key">:w</span> Save tasks</div>
              <div class="help-command"><span class="key">:q</span> Quit application</div>
            </div>
          </div>

          <div class="help-section">
            <h3>SCHEDULE COMMANDS</h3>
            <div class="help-commands">
              <div class="help-command"><span class="key">:time</span> Show current task schedule</div>
              <div class="help-command"><span class="key">:schedule</span> Set to today (no args)</div>
              <div class="help-command"><span class="key">:sched 今天</span> Set to today (short form)</div>
              <div class="help-command"><span class="key">:sched 明天</span> Set to tomorrow</div>
              <div class="help-command"><span class="key">:sched 周一</span> Set to this Monday</div>
              <div class="help-command"><span class="key">:sched 每周一</span> Set to every Monday (recurring)</div>
              <div class="help-command"><span class="key">:sched 2025-08-01</span> Set specific date</div>
              <div class="help-command"><span class="key">:sched 2025-08-01 14:30:00</span> Set date & time</div>
              <div class="help-command"><span class="key">:sched clear</span> Clear schedule</div>
              <div class="help-note">Time format: YYYY-MM-DD HH:MM:SS</div>
              <div class="help-note">Supports: 周一~周日, 星期一~星期日, Monday~Sunday</div>
              <div class="help-note">:sched is short for :schedule</div>
            </div>
          </div>

          <div class="help-section">
            <h3>CONTENT NAVIGATION MODE</h3>
            <div class="help-commands">
              <div class="help-command"><span class="key">h/j/k/l</span> Move cursor in content</div>
              <div class="help-command"><span class="key">i</span> Insert at cursor position</div>
              <div class="help-command"><span class="key">ESC</span> Return to normal mode</div>
            </div>
          </div>

          <div class="help-section">
            <h3>INSERT MODE</h3>
            <div class="help-commands">
              <div class="help-command"><span class="key">ESC</span> Return to normal mode</div>
              <div class="help-command"><span class="key">Enter</span> Save and exit (title editing)</div>
            </div>
          </div>

          <div class="help-section">
            <h3>CONFIG MODE</h3>
            <div class="help-commands">
              <div class="help-command"><span class="key">j/k</span> Navigate between sections</div>
              <div class="help-command"><span class="key">Enter</span> Edit selected section</div>
              <div class="help-command"><span class="key">ESC</span> Exit editing or close config</div>
            </div>
          </div>
        </div>
        <div class="help-footer">
          <span class="key-hint">j/k</span> scroll • <span class="key-hint">gg/G</span> top/bottom
        </div>
      </div>
    </div>

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

/* Help Panel Styles */
.help-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
  pointer-events: auto !important;
}

.help-panel {
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 8px;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
  animation: slideIn 0.2s ease;
  position: relative;
  pointer-events: auto !important;
}

.help-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #3e3e42;
  background: #383838;
  flex-shrink: 0;
  border-radius: 8px 8px 0 0;
}


.key-hint {
  background: #1e1e1e;
  color: #f9e79f;
  padding: 1px 4px;
  border-radius: 2px;
  border: 1px solid #3e3e42;
  font-weight: 600;
  font-size: 10px;
}

.help-header h2 {
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}


.help-content {
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  flex: 1;
  overflow-y: auto;
  background: #1e1e1e;
}

.help-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 24px;
  border-top: 1px solid #3e3e42;
  background: #383838;
  flex-shrink: 0;
  border-radius: 0 0 8px 8px;
  color: #a5a5a5;
  font-size: 12px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}


.help-section h3 {
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.help-commands {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.help-command {
  display: flex;
  align-items: center;
  color: #d4d4d4;
  font-size: 13px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  line-height: 1.4;
}

.key {
  background: #1e1e1e;
  color: #f9e79f;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #3e3e42;
  font-weight: 600;
  margin-right: 12px;
  min-width: 60px;
  text-align: center;
  font-size: 11px;
}

.help-note {
  color: #a5a5a5;
  font-size: 11px;
  font-style: italic;
  margin-left: 72px;
  margin-top: 4px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
