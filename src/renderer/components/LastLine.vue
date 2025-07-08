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
  logger.info('LastLine', 'LastLine component mounted');
  logger.info('LastLine', `Initial state: isLastLineVisible=${isLastLineVisible.value}, lastlineContent="${lastlineContent.value}"`);
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

const handleAnyKeydown = (event: KeyboardEvent) => {
  logger.info('LastLine', `handleAnyKeydown called with key: ${event.key}`);
  // Allow normal typing, ESC and Enter are handled separately
  if (event.key === 'Tab') {
    event.preventDefault();
    handleTabCompletion();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    // 取消命令输入
    taskDataManager.transition('Escape');
  }
  // 注意：Enter键不在这里处理，由@keydown.enter.prevent="handleEnterKey"处理
};

const handleEnterKey = (event: KeyboardEvent) => {
  // 如果处于输入法组合状态，不阻止默认行为，让输入法处理
  if (isComposing.value) {
    return; // 让输入法完成组合
  }
  event.preventDefault();
  logger.info('LastLine', 'handleEnterKey called - delegating to global keyboard handler');
  // 不在组件内处理命令逻辑，而是通过全局键盘管理器处理
  // 这样保持统一的事件处理流程
};

// 输入法组合开始
const handleCompositionStart = () => {
  isComposing.value = true;
  logger.info('LastLine', 'IME composition started');
};

// 输入法组合结束
const handleCompositionEnd = () => {
  isComposing.value = false;
  logger.info('LastLine', 'IME composition ended');
};

// 命令补全功能
const handleTabCompletion = () => {
  const content = lastlineContent.value;
  if (content.startsWith(':')) {
    const command = content.substring(1).toLowerCase();
    const availableCommands = ['help', 'quit', 'q', 'write', 'w', 'wq'];
    const matchingCommands = availableCommands.filter(cmd => cmd.startsWith(command));

    if (matchingCommands.length === 1) {
      // 只有一个匹配项，自动补全
      taskDataManager.updateLastlineContent(':' + matchingCommands[0]);
    } else if (matchingCommands.length > 1) {
      // 多个匹配项，显示第一个
      taskDataManager.updateLastlineContent(':' + matchingCommands[0]);
    }
  }
};

// 监听lastline可见性变化，自动聚焦输入框
watch(isLastLineVisible, (visible) => {
  logger.info('LastLine', `isLastLineVisible changed to: ${visible}`);
  if (visible) {
    nextTick(() => {
      logger.info('LastLine', 'Focusing input after visibility change');
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
  bottom: 24px;
  /* Above status line */
  left: 0;
  right: 0;
  height: 32px;
  background: #1e1e1e;
  color: #d4d4d4;
  display: flex;
  align-items: center;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 14px;
  z-index: 999;
  border-top: 1px solid #3e3e42;
  padding: 0 12px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.3);
}

.prompt-symbol {
  color: #f9e79f;
  margin-right: 8px;
  flex-shrink: 0;
  font-weight: 500;
  font-size: 15px;
}

.command-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #d4d4d4;
  font-family: inherit;
  font-size: inherit;
  outline: none;
  padding: 4px 0;
  margin: 0;
  line-height: 1.4;
  min-height: 20px;
}

.command-input::placeholder {
  color: #6e7681;
  font-style: italic;
}

.command-input:focus {
  color: #ffffff;
}

/* 添加一些动画效果 */
.vim-command-line {
  animation: slideUp 0.2s ease-out;
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