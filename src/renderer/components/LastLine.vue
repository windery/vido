<template>
  <div v-if="isLastLineVisible" class="vim-command-line">
    <span class="prompt-symbol">{{ getPromptSymbol() }}</span>
    <div class="input-wrap">
      <span class="display-text" aria-hidden="true"><span class="typed">{{ displayValue }}</span><span v-if="suggestion" class="ghost">{{ suggestion }}</span></span>
      <input v-model="lastlineContentWithSetter" ref="inputRef" class="command-input" :placeholder="inputPlaceholder"
        @keydown="handleAnyKeydown" @keydown.enter.prevent="handleEnterKey" @input="handleInput"
        @compositionstart="handleCompositionStart" @compositionend="handleCompositionEnd" spellcheck="false"
        autocomplete="off" type="text" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, nextTick, computed } from 'vue';
import { useTaskState } from '../composables/use-task-state';
import { logger } from '../utils/logger';
import { t } from '../i18n';
import { getCurrentDate } from '../utils/date-formatter';

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

// 去前缀的输入文本（display-text 渲染层用）
const displayValue = computed(() => {
  const content = lastlineContent.value;
  if (content.startsWith('/') || content.startsWith(':') || content.startsWith('?')) {
    return content.substring(1);
  }
  return content;
});

// 占位提示：区分命令（含 Tab 补全提示）与搜索
const inputPlaceholder = computed(() => {
  const content = lastlineContent.value;
  if (content.startsWith('/') || content.startsWith('?')) {
    return t('lastline.searchPlaceholder');
  }
  return t('lastline.commandPlaceholder');
});

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
  // 历史浏览改变输入，重置 Tab 循环会话
  tabSession = null;
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
  'clear', 'delete', 'help', 'new', 'p',
  'q', 'quit', 'redo', 'schedule', 'sort', 't', 'tag', 'theme', 'time',
  'undo', 'w', 'write', 'wq',
];

// schedule 参数候选（:schedule <arg>）
const WEEKDAY_WORDS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const SCHEDULE_ARG_KEYWORDS = ['today', 'tomorrow', 'next week', ...WEEKDAY_WORDS, 'every', 'clear'];
/** 纯日期未给时间时的默认时间（上午 10 点） */
const DEFAULT_TIME = '10:00';

type CompletionMode = 'command' | 'schedule-arg' | 'none';

/** 解析当前补全上下文：命令名阶段（无空格）或 schedule 参数阶段（空格后） */
function resolveCompletion(): { mode: CompletionMode; candidates: string[]; arg: string } {
  const content = lastlineContent.value;
  if (!content.startsWith(':')) return { mode: 'none', candidates: [], arg: '' };
  const body = content.substring(1);
  const spaceIdx = body.indexOf(' ');
  if (spaceIdx === -1) {
    // 命令名阶段
    const cmd = body.toLowerCase();
    if (!cmd) return { mode: 'none', candidates: [], arg: '' };
    return { mode: 'command', candidates: AVAILABLE_COMMANDS.filter((c) => c.startsWith(cmd)), arg: cmd };
  }
  // 参数阶段：仅 schedule 有参数补全
  const cmd = body.slice(0, spaceIdx).toLowerCase();
  const arg = body.slice(spaceIdx + 1);
  if (cmd === 'schedule') {
    return { mode: 'schedule-arg', candidates: getScheduleArgCandidates(arg), arg };
  }
  return { mode: 'none', candidates: [], arg: '' };
}

/**
 * schedule 参数候选：
 * - 关键字：today / tomorrow / next week / monday~sunday / every / clear
 * - 数字开头：补全为今天日期（提醒日期格式 YYYY-MM-DD）
 * - 日期完整 + 空格：进入时间部分，候选为默认时间 10:00
 */
function getScheduleArgCandidates(arg: string): string[] {
  const a = arg.toLowerCase();
  // 日期完整 + 尾随空格 → 默认时间（时间部分补全开始）
  if (/^\d{4}-\d{2}-\d{2} $/.test(a)) return [DEFAULT_TIME];
  // 日期 + 时间前缀 → 默认时间前缀匹配
  if (/^\d{4}-\d{2}-\d{2} \d/.test(a)) {
    const time = a.slice(11);
    return DEFAULT_TIME.startsWith(time) ? [DEFAULT_TIME] : [];
  }
  const trimmed = a.trim();
  // 日期完整（无尾随空格）：无候选，Enter 即默认 10:00
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return [];
  // every 后 → 星期候选
  if (/^every $/.test(a)) return WEEKDAY_WORDS.map((w) => `every ${w}`);
  if (/^every \w/.test(a)) {
    const w = trimmed.slice(6);
    return WEEKDAY_WORDS.filter((x) => x.startsWith(w)).map((x) => `every ${x}`);
  }
  if (!trimmed) return SCHEDULE_ARG_KEYWORDS;
  // 数字开头 → 默认补全今天日期
  if (/^\d/.test(trimmed)) {
    const today = getCurrentDate();
    return today.startsWith(trimmed) ? [today] : [];
  }
  return SCHEDULE_ARG_KEYWORDS.filter((k) => k.startsWith(trimmed));
}

/** 灰色候选预览：显示第一个匹配的剩余部分（terminal autosuggestion 风格） */
const suggestion = computed(() => {
  const content = lastlineContent.value;
  if (!content.startsWith(':')) return '';
  const { mode, candidates, arg } = resolveCompletion();
  if (mode === 'none' || candidates.length === 0) return '';
  const first = candidates[0];
  if (mode === 'command') {
    return first.length > arg.length ? first.slice(arg.length) : '';
  }
  // schedule-arg：arg 是候选前缀 → 候选剩余
  if (first.startsWith(arg)) {
    return first.length > arg.length ? first.slice(arg.length) : '';
  }
  // 日期 + 空格/时间前缀：候选是独立时间文本，取时间 token 后的剩余
  const m = arg.match(/^\d{4}-\d{2}-\d{2} (.*)$/);
  if (m) {
    const time = m[1];
    return first.length > time.length ? first.slice(time.length) : '';
  }
  return '';
});

/** Tab 循环补全会话：基于首次按 Tab 时的候选列表，之后每按一次 Tab 换下一个候选 */
let tabSession: { mode: CompletionMode; candidates: string[]; index: number } | null = null;

const handleInput = () => {
  // 用户键入（非 Tab 补全）重置循环会话，回到首个候选预览
  tabSession = null;
};

/** 把候选应用到 schedule 参数：日期+时间阶段替换时间 token，其余直接取候选（候选含已输入前缀） */
function applyScheduleArgCompletion(arg: string, candidate: string): string {
  const m = arg.match(/^(\d{4}-\d{2}-\d{2} ).*$/);
  if (m) return m[1] + candidate;
  return candidate;
}

const handleTabCompletion = () => {
  const content = lastlineContent.value;
  if (!content.startsWith(':')) return;
  const { mode, candidates, arg } = resolveCompletion();
  if (mode === 'none' || candidates.length === 0) return;
  // 会话由 handleInput（用户键入）/ navigateHistory（历史浏览）/ 关闭时重置；
  // 这里只要会话存在就继续循环候选；模式切换（命令名 → 参数）时开新会话
  if (!tabSession || tabSession.mode !== mode) {
    tabSession = { mode, candidates, index: 0 };
  }
  const candidate = tabSession.candidates[tabSession.index % tabSession.candidates.length];
  tabSession.index++;
  if (mode === 'command') {
    taskDataManager.updateLastlineContent(':' + candidate);
  } else {
    taskDataManager.updateLastlineContent(':schedule ' + applyScheduleArgCompletion(arg, candidate));
  }
};

// 监听lastline可见性变化：打开时聚焦输入框并重置历史浏览，关闭时清空浏览态
watch(isLastLineVisible, (visible) => {
  historyIndex.value = -1;
  draftInput.value = '';
  tabSession = null;
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

.input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

/* 渲染层：真实文本 + 灰色候选，与 input 完全重叠（input 文本透明仅保留 caret） */
.display-text {
  position: absolute;
  inset: 0;
  padding: 4px 0;
  line-height: 1.4;
  white-space: pre;
  overflow: hidden;
  pointer-events: none;
  color: var(--text);
  font-family: inherit;
  font-size: inherit;
}

.display-text .ghost {
  color: var(--text-faint);
}

.command-input {
  position: relative;
  width: 100%;
  background: transparent;
  border: none;
  color: transparent;
  caret-color: var(--text);
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