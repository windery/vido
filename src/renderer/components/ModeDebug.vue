<template>
  <!-- Vim-style status line at bottom -->
  <div class="vim-status-line">
    <div class="status-left">
      <span class="mode-indicator" :class="getModeClass(editorMode)">
        {{ getModeText(editorMode) }}
      </span>
      <span class="file-info">
        vido.todo [+]
      </span>
    </div>
    <div class="status-center">
      <span v-if="editorMode === EditorMode.TITLE_EDIT" class="help-text">
        -- TITLE EDIT -- (editing task title)
      </span>
      <span v-else-if="editorMode === EditorMode.CONTENT_EDIT" class="help-text">
        -- INSERT -- (editing task content)
      </span>
      <span v-else-if="editorMode === EditorMode.LAST_LINE" class="help-text">
        {{ getLastLineModeText() }}
      </span>
      <span v-else-if="editorMode === EditorMode.CONTENT_NAVIGATION" class="help-text">
        -- CONTENT-NAV -- (hjkl to move, i to insert)
      </span>
      <span v-else class="help-text">
        Press ? for help
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EditorMode } from '../domain/editor';
import { useTaskState } from '../composables/use-task-state';

// 使用新的统一状态管理架构
const { editorMode, lastlineContent } = useTaskState();

const getModeText = (mode: EditorMode) => {
  switch (mode) {
    case EditorMode.COMMAND:
      return 'NORMAL';
    case EditorMode.TITLE_EDIT:
      return 'TITLE-EDIT';
    case EditorMode.CONTENT_EDIT:
      return 'CONTENT-EDIT';
    case EditorMode.CONTENT_NAVIGATION:
      return 'CONTENT-NAV';
    case EditorMode.LAST_LINE:
      // 根据lastlineContent的前缀来判断是搜索还是命令模式
      if (lastlineContent.value.startsWith('/')) {
        return 'SEARCH';
      } else if (lastlineContent.value.startsWith(':')) {
        return 'COMMAND';
      } else {
        return 'LAST-LINE';
      }
    default:
      return 'UNKNOWN';
  }
};

const getLastLineModeText = () => {
  if (lastlineContent.value.startsWith('/')) {
    return '-- SEARCH -- (type your search query)';
  } else if (lastlineContent.value.startsWith(':')) {
    return '-- COMMAND -- (type vim command)';
  } else {
    return '-- LAST-LINE --';
  }
};

const getModeClass = (mode: EditorMode) => {
  switch (mode) {
    case EditorMode.COMMAND:
      return 'mode-normal';
    case EditorMode.TITLE_EDIT:
      return 'mode-title-edit';
    case EditorMode.CONTENT_EDIT:
      return 'mode-content-edit';
    case EditorMode.CONTENT_NAVIGATION:
      return 'mode-visual';
    case EditorMode.LAST_LINE:
      // 根据lastlineContent的前缀来判断是搜索还是命令模式
      if (lastlineContent.value.startsWith('/')) {
        return 'mode-search';
      } else if (lastlineContent.value.startsWith(':')) {
        return 'mode-command';
      } else {
        return 'mode-last-line';
      }
    default:
      return 'mode-unknown';
  }
};
</script>

<style scoped>
.vim-status-line {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 24px;
  background: #007acc;
  color: #ffffff;
  display: flex;
  align-items: center;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 12px;
  z-index: 1000;
  padding: 0 8px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-center {
  flex: 1;
  text-align: center;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-indicator {
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
}

.mode-normal {
  background: #4caf50 !important;
}

.mode-title-edit {
  background: #e91e63 !important;
}

.mode-content-edit {
  background: #ff9800 !important;
}

.mode-visual {
  background: #9c27b0 !important;
}

.mode-command {
  background: #2196f3 !important;
}

.mode-search {
  background: #ff5722 !important;
}

.mode-last-line {
  background: #607d8b !important;
}

.mode-config {
  background: #795548 !important;
}

.mode-unknown {
  background: #f44336 !important;
}

.file-info {
  color: #e0e0e0;
}

.help-text {
  font-style: italic;
  color: #f0f0f0;
}
</style>
