<template>
  <div v-if="isLastLineVisible" class="vim-command-line">
    <span class="prompt-symbol">{{ getPromptSymbol() }}</span>
    <input v-model="lastlineContentWithSetter" ref="inputRef" class="command-input" @keydown="handleAnyKeydown"
      @keydown.enter.prevent="handleEnterKey" @compositionstart="handleCompositionStart"
      @compositionend="handleCompositionEnd" spellcheck="false" autocomplete="off" type="text" />
  </div>

</template>

<script setup lang="ts">
import { onMounted, ref, watch, nextTick, computed } from 'vue';
import { useTaskState } from '../composables/use-task-state';
import { logger } from '../utils/logger';

const {
  taskDataManager,
  lastlineContent,
  lastlineVisible
} = useTaskState();

// 添加调试日志
onMounted(() => {
  logger.debug('LastLine', 'LastLine component mounted');
  logger.debug('LastLine', 'Initial state', { isLastLineVisible: isLastLineVisible.value, lastlineContent: lastlineContent.value });
});

const inputRef = ref<HTMLInputElement | null>(null);

// 输入法组合状态追踪
const isComposing = ref(false);

// 使用响应式的lastlineVisible状态
const isLastLineVisible = computed(() => {
  const visible = lastlineVisible.value;
  return visible;
});

// 使用响应式的lastlineContent状态，并添加setter
// 显示的内容不包含前缀，但保存时添加前缀
const lastlineContentWithSetter = computed({
  get: () => {
    const content = lastlineContent.value;
    if (content.startsWith('/')) {
      return content.substring(1);
    } else if (content.startsWith(':')) {
      return content.substring(1);
    } else if (content.startsWith('?')) {
      return content.substring(1);
    }
    return content;
  },
  set: (value: string) => {
    const content = lastlineContent.value;
    let prefix = '';
    if (content.startsWith('/')) {
      prefix = '/';
    } else if (content.startsWith(':')) {
      prefix = ':';
    } else if (content.startsWith('?')) {
      prefix = '?';
    }
    taskDataManager.updateLastlineContent(prefix + value);
  }
});

const getPromptSymbol = () => {
  const content = lastlineContent.value;
  if (content.startsWith('/')) {
    return '/';
  } else if (content.startsWith('?')) {
    return '?';
  } else if (content.startsWith(':')) {
    return ':';
  }
  // 默认情况
  return '';
};

// 命令历史浏览（vim 语义：↑ 上一条，↓ 下一条，边界回到草稿）
const historyIndex = ref(-1);
const draftInput = ref('');

const handleAnyKeydown = (event: KeyboardEvent) => {
  // Allow normal typing, ESC and Enter are handled separately
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    navigateHistory(event.key);
  } else if (event.key === 'Tab') {
    event.preventDefault();
    handleTabCompletion();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    // 取消命令输入
    historyIndex.value = -1;
    draftInput.value = '';
    taskDataManager.transition('Escape');
  }
  // 注意：Enter键不在这里处理，由@keydown.enter.prevent="handleEnterKey"处理
};

const navigateHistory = (key: string) => {
  const hist = taskDataManager.getLastlineHistory();
  if (hist.length === 0) return;
  if (key === 'ArrowUp') {
    // 首次按 ↑ 时保存当前输入作为草稿，↓ 到底后恢复
    if (historyIndex.value === -1) {
      draftInput.value = lastlineContent.value;
    }
    if (historyIndex.value < hist.length - 1) {
      historyIndex.value++;
      taskDataManager.updateLastlineContent(hist[hist.length - 1 - historyIndex.value]);
    }
  } else {
    if (historyIndex.value >= 0) {
      historyIndex.value--;
      if (historyIndex.value === -1) {
        taskDataManager.updateLastlineContent(draftInput.value);
      } else {
        taskDataManager.updateLastlineContent(hist[hist.length - 1 - historyIndex.value]);
      }
    }
  }
};

const handleEnterKey = (event: KeyboardEvent) => {
  // 如果处于输入法组合状态，不阻止默认行为，让输入法处理
  if (isComposing.value) {
    return; // 让输入法完成组合
  }
  event.preventDefault();
  logger.debug('LastLine', 'handleEnterKey called - delegating to global keyboard handler');
  // 不在组件内处理命令逻辑，而是通过全局键盘管理器处理
  // 这样保持统一的事件处理流程
};

// 输入法组合开始
const handleCompositionStart = () => {
  isComposing.value = true;
};

// 输入法组合结束
const handleCompositionEnd = () => {
  isComposing.value = false;
};

// 命令补全功能
const AVAILABLE_COMMANDS = [
  'clear', 'delete', 'help', 'lang', 'language', 'new', 'p',
  'q', 'quit', 'redo', 'sched', 'schedule', 'sort', 't', 'tag', 'theme', 'time',
  'undo', 'w', 'write', 'wq',
];

function commonPrefix(cmds: string[]): string {
  if (cmds.length === 0) return '';
  let p = cmds[0];
  for (const c of cmds.slice(1)) {
    while (c.slice(0, p.length) !== p) p = p.slice(0, -1);
    if (!p) break;
  }
  return p;
}

const handleTabCompletion = () => {
  const content = lastlineContent.value;
  if (!content.startsWith(':')) return;
  const command = content.substring(1).toLowerCase();
  const matchingCommands = AVAILABLE_COMMANDS.filter(cmd => cmd.startsWith(command));

  if (matchingCommands.length === 1) {
    // 唯一匹配：补全完整命令
    taskDataManager.updateLastlineContent(':' + matchingCommands[0]);
  } else if (matchingCommands.length > 1) {
    // 多个匹配：补全公共前缀（vim 惯例），无增长则不变
    const prefix = commonPrefix(matchingCommands);
    if (prefix.length > command.length) {
      taskDataManager.updateLastlineContent(':' + prefix);
    }
  }
};

// 监听lastline可见性变化：打开时聚焦输入框并重置历史浏览，关闭时清空浏览态
watch(isLastLineVisible, (visible) => {
  historyIndex.value = -1;
  draftInput.value = '';
  if (visible) {
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});

onMounted(() => {
  // 确保在mounted时如果lastline可见则聚焦
  if (isLastLineVisible.value) {
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});
</script>

<style scoped>
.vim-command-line {
  position: fixed;
  bottom: 26px;
  /* Above status line */
  left: 0;
  right: 0;
  height: 34px;
  background: var(--lastline-bg);
  color: var(--text);
  display: flex;
  align-items: center;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 14px;
  z-index: 999;
  border-top: 1px solid var(--border);
  padding: 0 12px;
  box-shadow: 0 -2px 8px var(--lastline-shadow);
}

.prompt-symbol {
  color: var(--p2);
  margin-right: 8px;
  flex-shrink: 0;
  font-weight: 700;
  font-size: 15px;
}

.command-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text);
  font-family: inherit;
  font-size: inherit;
  outline: none;
  padding: 4px 0;
  margin: 0;
  line-height: 1.4;
  min-height: 20px;
}

.command-input::placeholder {
  color: var(--text-dim);
  font-style: italic;
}

.command-input:focus {
  color: var(--text-bright);
}

.command-input:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 2px;
  border-radius: 2px;
}

/* 添加一些动画效果 */
.vim-command-line {
  animation: slideUp 0.15s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>