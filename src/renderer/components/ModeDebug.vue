<template>
  <!-- Terminal Purist status line at bottom -->
  <div class="vim-status-line">
    <div class="status-left">
      <span class="mode-indicator" :class="getModeClass(editorMode)">
        {{ getModeText(editorMode) }}
      </span>
      <span v-if="dirty" class="modified-mark">[+]</span>
    </div>
    <div class="status-center">
      <span v-if="flashMessage" class="flash-message">{{ flashMessage }}</span>
      <span v-else-if="editorMode === EditorMode.TITLE_EDIT" class="help-text">
        {{ t('mode.titleEdit') }}
      </span>
      <span v-else-if="editorMode === EditorMode.CONTENT_EDIT" class="help-text">
        {{ t('mode.contentEdit') }}
      </span>
      <span v-else-if="editorMode === EditorMode.LAST_LINE" class="help-text">
        {{ getLastLineModeText() }}
      </span>
      <span v-else-if="editorMode === EditorMode.CONTENT_NAVIGATION" class="help-text">
        {{ t('mode.contentNav') }}
      </span>
      <span v-else-if="calendarVisible" class="help-text">
        {{ t('mode.calendar') }}
      </span>
      <span v-else-if="selectedTask?.configState" class="help-text">
        {{ configModeText }}
      </span>
      <span v-else-if="searchActive" class="help-text search-term">/{{ searchTerm }}</span>
      <span v-else class="help-text">
        {{ t('mode.help') }}
      </span>
    </div>
    <div class="status-right">
      <span class="task-counter">{{ taskCounter }}</span>
      <span v-if="posInfo" class="pos">{{ posInfo }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { EditorMode } from '../domain/editor';
import { useTaskState } from '../composables/use-task-state';
import { t } from '../i18n';

// 使用新的统一状态管理架构
const { editorMode, lastlineContent, selectedTask, tasks, filteredTasks, cursorPosition, flashMessage, dirty, calendarVisible, configNavIndex } = useTaskState();

// 搜索过滤激活（lastlineContent 以 / 开头且有词）
const searchTerm = computed(() => {
  const f = lastlineContent.value;
  return f && f.startsWith('/') && f.length > 1 ? f.slice(1) : '';
});
const searchActive = computed(() => searchTerm.value !== '');

// 右下角统计：可见/全部任务数（单复数，程序员会在意 "1 tasks" 这种低级错误）
const taskCounter = computed(() => {
  const total = tasks.value.length;
  const label = total === 1 ? t('status.task') : t('status.tasks');
  return `${filteredTasks.value.length}/${total} ${label}`;
});

// 配置面板展开时：键位提示统一收敛到状态栏底部中间（task item 内不展示提示）；
// nav 态附当前位置 [n/total]
const configModeText = computed(() => {
  const cs = selectedTask.value?.configState;
  const nav = configNavIndex.value;
  const navPos = (total: number) => (nav > 0 && total > 0 ? ` [${nav}/${total}]` : '');
  switch (cs) {
    case 'schedule-select': return t('mode.configSchedule') + navPos(5);
    case 'priority-select': return t('mode.configPriority') + navPos(4);
    case 'tags-select': return t('mode.configTags') + navPos((selectedTask.value?.tags?.length || 0) + 2);
    case 'schedule-edit': return t('mode.configScheduleEdit');
    case 'tags-edit': return t('mode.configTagsEdit');
    default: return t('mode.config');
  }
});

// 光标位置：内容导航 / 编辑时显示「行 · 列」
const posInfo = computed(() => {
  if (editorMode.value === EditorMode.CONTENT_NAVIGATION || editorMode.value === EditorMode.CONTENT_EDIT) {
    const pos = cursorPosition.value;
    if (pos) return t('status.pos', { l: pos.line + 1, c: pos.column });
  }
  return '';
});

const getModeText = (mode: EditorMode) => {
  // 配置展开时徽标显示当前 config 子状态（select/edit 区分类型与阶段）
  const cs = selectedTask.value?.configState;
  switch (cs) {
    case 'schedule-select': return 'SCHEDULE';
    case 'schedule-edit': return 'SCHEDULE-EDIT';
    case 'priority-select': return 'PRIORITY';
    case 'tags-select': return 'TAGS';
    case 'tags-edit': return 'TAGS-EDIT';
  }
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
    return t('mode.search');
  } else if (lastlineContent.value.startsWith(':')) {
    return t('mode.command');
  } else {
    return t('mode.lastLine');
  }
};

const getModeClass = (mode: EditorMode) => {
  if (selectedTask.value?.configState) return 'mode-config';
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
  height: 26px;
  background: var(--surface);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 12px;
  z-index: 1000;
  padding: 0 12px;
  border-top: 1px solid var(--border);
  user-select: none;
  box-sizing: border-box;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.status-center {
  flex: 1;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 14px;
  flex-shrink: 0;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.task-counter {
  color: var(--text-3);
}

.pos {
  color: var(--text-2);
}

.mode-indicator {
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.06em;
  padding: 1px 8px;
  border-radius: 3px;
  background: var(--mode-badge-bg);
  font-family: system-ui, -apple-system, sans-serif;
  transition: color 0.15s ease, background 0.15s ease;
}

.mode-normal {
  color: var(--mode-normal);
}

.mode-title-edit,
.mode-content-edit {
  color: var(--mode-insert);
}

.mode-visual {
  color: var(--p2);
}

.mode-command,
.mode-search,
.mode-last-line {
  color: var(--mode-lastline);
}

.mode-config,
.mode-unknown {
  color: var(--mode-help);
}

/* vim 语义：未保存修改时 [+] 亮绿，保存后消失 */
.modified-mark {
  color: var(--accent-bright);
  font-weight: 700;
}

.help-text {
  font-style: italic;
  color: var(--text-muted);
}

/* 激活的搜索过滤词：磷光绿等宽，非斜体——过滤状态必须一眼可辨 */
.search-term {
  font-style: normal;
  font-weight: 600;
  color: var(--accent-bright);
}

.flash-message {
  color: var(--accent);
  font-weight: 600;
  letter-spacing: 0.02em;
}
</style>
