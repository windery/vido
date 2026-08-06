<template>
    <div class="task-container" :data-task-id="task.id"
        :style="{ marginLeft: (task.indent || 0) * 24 + 'px' }">
        <!-- Task line（整体右移，选中高亮不覆盖缩进轨道） -->
        <div :class="['task-line', {
            'selected': task.selected,
            'completed': task.completed,
            'editing': task.status === TaskState.CONTENT_EDITING || task.status === TaskState.TITLE_EDITING,
            'subtask': (task.indent || 0) > 0,
            'group-leader': isGroupLeader
        }]">
            <span class="line-number">{{ index + 1 }}</span>

            <!-- Task content in vim style -->
            <div class="line-content">
                <!-- 完成状态圈：✓ 绿（已完成）/ ○ 灰（未完成），固定列对齐 -->
                <span class="status-indicator" :class="{ 'done': task.completed }">{{ task.completed ? '✓' : '○' }}</span>

                <!-- 优先级紧凑前置标识：未设置时不占位（标题紧跟编号），设置后显示 !!!/!!/! -->
                <span v-if="task.priority" :class="['priority-indicator', getPriorityClass(task.priority)]">{{ getPriorityMark(task.priority) }}</span>

                <span v-if="task.status === TaskState.TITLE_EDITING && task.selected" class="editing-inline">
                    <input ref="titleEditRef" :value="task.title" class="title-editor" spellcheck="false" @input="handleTitleInput"
                        @keydown="handleTitleKeydown" @blur="stopTitleEditing" @keydown.enter="stopTitleEditing"
                        @keydown.esc="stopTitleEditing" @compositionstart="handleCompositionStart"
                        @compositionend="handleCompositionEnd" />
                </span>
                <span v-else class="task-title" v-html="highlightTitle(task.title)"></span>

                <span v-if="task.flagged" class="flag-indicator">⚑</span>
            </div>
        </div>

        <!-- Task Content Component：常驻挂载，仅当选中有内容时才展示（vim-instant，无动画） -->
        <TaskContent :task="task" @cursor-update="handleCursorUpdate"
            @content-keydown="handleContentKeydown" @content-input="handleContentInput"
            @textarea-ref="handleTextareaRef" />

        <!-- 元信息行（内容区之后常驻显示）：标签 #tag + 日程 @date，长内容/多标签也不挤标题行 -->
        <div v-if="(task.tags && task.tags.length) || task.schedule" class="task-meta">
            <span v-if="task.tags && task.tags.length" class="meta-tags">
                <span v-for="tag in task.tags" :key="tag" class="meta-tag">#{{ tag }}</span>
            </span>
            <span v-if="task.schedule" class="meta-schedule" :class="'sch-' + getScheduleDisplay(task.schedule).status">
                {{ getScheduleDisplay(task.schedule).text }}
                <span v-if="isScheduleExpired(task.schedule)" class="expired-indicator">{{ t('task.expired') }}</span>
            </span>
        </div>

        <!-- Config panel -->
        <div v-if="task.configState" class="config-panel">
          <!-- 面板标题：明确当前正在配置什么（@ 日程 / ! 优先级 / # 标签） -->
          <div class="config-header">
            <span class="config-header-icon" :class="configHeaderInfo.cls">{{ configHeaderInfo.icon }}</span>
            <span class="config-header-title">{{ configHeaderInfo.title }}</span>
            <span class="config-header-phase">{{ configHeaderInfo.phase }}</span>
          </div>
          <!-- Schedule -->
          <template v-if="task.configState === 'schedule-select' || task.configState === 'schedule-edit'">
            <div v-if="task.configState === 'schedule-edit'" class="config-input-row">
              <span class="config-input-icon">@</span>
              <input ref="scheduleInputRef" v-model="scheduleInputValue" class="config-input" spellcheck="false"
                :placeholder="t('config.schedulePlaceholder')"
                @keydown.enter.stop="saveScheduleInput" @keydown.escape.stop="cancelScheduleInput" />
            </div>
            <div v-else class="config-pills">
              <span class="config-pill"><kbd>1</kbd> {{ t('config.today') }}</span>
              <span class="config-pill"><kbd>2</kbd> {{ t('config.tomorrow') }}</span>
              <span class="config-pill"><kbd>3</kbd> {{ t('config.nextWeek') }}</span>
              <span class="config-pill"><kbd>cc</kbd> {{ t('config.clear') }}</span>
              <span class="config-pill config-pill-enter"><kbd>⏎</kbd> {{ t('config.custom') }}</span>
            </div>
          </template>
          <!-- Priority -->
          <template v-else-if="task.configState === 'priority-select'">
            <div class="config-pills">
              <span class="config-pill priority-p1"><kbd>1</kbd> !!! {{ t('config.high') }}</span>
              <span class="config-pill priority-p2"><kbd>2</kbd> !! {{ t('config.medium') }}</span>
              <span class="config-pill priority-p3"><kbd>3</kbd> ! {{ t('config.low') }}</span>
              <span class="config-pill"><kbd>cc</kbd> {{ t('config.clear') }}</span>
            </div>
          </template>
          <!-- Tags -->
          <template v-else-if="task.configState === 'tags-select' || task.configState === 'tags-edit'">
            <div v-if="task.tags?.length" class="config-tags-display">
              <span v-for="(tag, i) in task.tags" :key="tag" class="config-tag"
                  :class="{ 'config-tag-del': tagDeleteIndex === i + 1 }">
                <span class="config-tag-idx">{{ i + 1 }}</span>
                <span v-if="tagDeleteIndex === i + 1" class="config-tag-x">✕</span>
                <span class="config-tag-name">#{{ tag }}</span>
              </span>
            </div>
            <span v-else class="config-empty-hint">{{ t('config.noTags') }}</span>
            <div v-if="task.tags?.length" class="config-tags-hint">{{ t('config.tagDeleteHint') }}</div>
            <div v-if="task.configState === 'tags-edit'" class="config-input-row">
              <span class="config-input-icon">#</span>
              <input ref="tagInputRef" v-model="tagInputValue" class="config-input" spellcheck="false"
                :placeholder="t('config.tagPlaceholder')"
                @keydown.enter.stop="saveTagInput" @keydown.escape.stop="cancelTagInput" />
            </div>
            <div v-else class="config-pills" style="margin-top:6px">
              <span class="config-pill config-pill-enter"><kbd>⏎</kbd> {{ t('config.add') }}</span>
              <span class="config-pill"><kbd>cc</kbd> {{ t('config.clear') }}</span>
            </div>
          </template>
          <div class="config-footer" v-html="t('config.footer')"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watchEffect, computed } from 'vue';
import { Task, TaskState, TaskPriority } from '../domain/task';
import { getScheduleDisplay, getScheduleDisplayText, isScheduleExpired, parseScheduleFromString } from '../utils/schedule-helper';
import TaskContent from './TaskContent.vue';
import { useTaskState } from '../composables/use-task-state';
import { t } from '../i18n';

interface Props {
    task: Task;
    index: number;

    searchTerm?: string;
    /** 是否为当前定位组的主任务（组首）——行背景淡绿强调主次 */
    isGroupLeader?: boolean;
}

interface Emits {
    (e: 'title-input', value: string, task: Task): void;
    (e: 'cursor-update', event: Event, task: Task): void;
    (e: 'content-keydown', event: KeyboardEvent, task: Task): void;
    (e: 'content-input', value: string, task: Task): void;
    (e: 'textarea-ref', taskId: number, textarea: HTMLTextAreaElement | null): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 标签删除待确认序号（0 = 无目标），驱动 tags-select 面板高亮
const { tagDeleteIndex } = useTaskState();

const titleEditRef = ref<HTMLInputElement | null>(null);

// 输入法组合状态追踪
const isComposing = ref(false);

const handleTitleInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    emit('title-input', target.value, props.task);
};

const handleTitleKeydown = (event: KeyboardEvent) => {
    const target = event.target as HTMLInputElement;

    // 对于普通字符输入，手动更新输入框的值（仅用于程序化键盘事件模拟）
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // 检查是否是程序化事件（通过isTrusted属性判断）
        // 程序化事件的isTrusted为false，真实用户事件的isTrusted为true
        if (!event.isTrusted) {
            // 只有程序化事件才需要手动添加字符
            const currentValue = target.value;
            const newValue = currentValue + event.key;
            target.value = newValue;

            // 触发 input 事件
            const inputEvent = new Event('input', { bubbles: true });
            target.dispatchEvent(inputEvent);

            // 阻止默认行为，避免重复
            event.preventDefault();
        }
        // 对于真实用户输入，让浏览器默认处理，不需要做任何事情
    }
};

// 输入法组合开始
const handleCompositionStart = () => {
    isComposing.value = true;
};

// 输入法组合结束
const handleCompositionEnd = () => {
    isComposing.value = false;
};

const stopTitleEditing = () => {
    // 标题编辑停止逻辑由父组件处理
};

const handleCursorUpdate = (event: Event) => {
    emit('cursor-update', event, props.task);
};

const handleContentKeydown = (event: KeyboardEvent) => {
    emit('content-keydown', event, props.task);
};

const handleContentInput = (value: string) => {
    emit('content-input', value, props.task);
};

const handleTextareaRef = (taskId: number, textarea: HTMLTextAreaElement | null) => {
    emit('textarea-ref', taskId, textarea);
};

// schedule 时间输入
const scheduleInputRef = ref<HTMLInputElement>();
const scheduleInputValue = ref('');

watchEffect(() => {
  if (props.task.configState === 'schedule-edit') {
    scheduleInputValue.value = '';
    nextTick(() => scheduleInputRef.value?.focus());
  }
});

const saveScheduleInput = () => {
  const val = scheduleInputValue.value.trim();
  if (val) {
    const s = parseScheduleFromString(val);
    if (s) {
      const tdm = useTaskState().taskDataManager;
      tdm.updateTaskProperty(props.task.id, 'schedule', s);
    }
  }
  useTaskState().taskDataManager.setConfigState(props.task.id, 'schedule-select');
};

const cancelScheduleInput = () => {
  useTaskState().taskDataManager.setConfigState(props.task.id, 'schedule-select');
};

// tag 输入
const tagInputRef = ref<HTMLInputElement>();
const tagInputValue = ref('');

watchEffect(() => {
  if (props.task.configState === 'tags-edit') {
    tagInputValue.value = '';
    nextTick(() => tagInputRef.value?.focus());
  }
});

const saveTagInput = () => {
  const val = tagInputValue.value.trim();
  if (val) {
    const tdm = useTaskState().taskDataManager;
    const currentTags = props.task.tags || [];
    if (!currentTags.includes(val)) {
      tdm.updateTaskProperty(props.task.id, 'tags', [...currentTags, val]);
    }
  }
  useTaskState().taskDataManager.setConfigState(props.task.id, 'tags-select');
};

const cancelTagInput = () => {
  useTaskState().taskDataManager.setConfigState(props.task.id, 'tags-select');
};

// 标题搜索高亮：安全转义后包裹 <mark>，避免 XSS
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c] as string));
}

function highlightTitle(title: string): string {
  if (!title) return t('task.noTitle');
  const escaped = escapeHtml(title);
  const term = (props.searchTerm || '').trim();
  if (!term) return escaped;
  const escapedTerm = escapeHtml(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escapedTerm) return escaped;
  try {
    return escaped.replace(new RegExp(escapedTerm, 'gi'), m => `<mark>${m}</mark>`);
  } catch {
    return escaped;
  }
}

const getPriorityClass = (priority?: TaskPriority) => {
    switch (priority) {
        case TaskPriority.HIGH:
            return 'priority-high';
        case TaskPriority.MEDIUM:
            return 'priority-medium';
        case TaskPriority.LOW:
            return 'priority-low';
        default:
            return '';
    }
};

// 古早命令行符号约定：优先级默认空，仅手动设置后显示（!!! 高 / !! 中 / ! 低）
const getPriorityMark = (priority?: TaskPriority): string => {
    switch (priority) {
        case TaskPriority.HIGH:
            return '!!!';
        case TaskPriority.MEDIUM:
            return '!!';
        case TaskPriority.LOW:
            return '!';
        default:
            return '';
    }
};

// 配置面板标题：符号即语义，明确当前配置项；phase 区分 select / edit 阶段
const configHeaderInfo = computed(() => {
    const cs = props.task.configState;
    switch (cs) {
        case 'schedule-select':
            return { icon: '@', cls: 'cfg-schedule', title: t('config.schedule'), phase: '' };
        case 'schedule-edit':
            return { icon: '@', cls: 'cfg-schedule', title: t('config.schedule'), phase: 'EDIT' };
        case 'priority-select':
            return { icon: '!', cls: 'cfg-priority', title: t('config.priority'), phase: '' };
        case 'tags-select':
            return { icon: '#', cls: 'cfg-tags', title: t('config.tags'), phase: '' };
        case 'tags-edit':
            return { icon: '#', cls: 'cfg-tags', title: t('config.tags'), phase: 'EDIT' };
        default:
            return { icon: '', cls: '', title: '', phase: '' };
    }
});

// 使用 watchEffect 来监听任务状态，确保在组件挂载时也能正确设置焦点
watchEffect(() => {
    if (props.task.status === TaskState.TITLE_EDITING && props.task.selected) {
        nextTick(() => {
            if (titleEditRef.value) {
                titleEditRef.value.focus();
                // 将光标移到末尾
                titleEditRef.value.setSelectionRange(titleEditRef.value.value.length, titleEditRef.value.value.length);
            } else {
                // 如果 ref 还不可用，再等一个 tick
                setTimeout(() => {
                    if (titleEditRef.value) {
                        titleEditRef.value.focus();
                        titleEditRef.value.setSelectionRange(titleEditRef.value.value.length, titleEditRef.value.value.length);
                    }
                }, 10);
            }
        });
    }
});
</script>

<style scoped>
.task-container {
    margin-bottom: 4px;
    position: relative;
}

.task-line {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 28px;
    padding: 4px 10px 4px 6px;
    box-sizing: border-box;
    border-radius: 3px;
    margin-bottom: 2px;
}

.task-line:hover {
    background: var(--bg-hover);
}

.task-line.selected {
    background: var(--bg-selected);
    color: var(--text-bright);
}

.task-line.selected::before {
    content: '›';
    position: absolute;
    left: 4px; /* task-line 已整体右移（container margin），› 即在缩进行首 */
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    line-height: 1;
    color: var(--accent);
    font-weight: 700;
    font-size: 15px;
}

/* 子任务次级感：行号弱化（轻量辅助，不破坏统一） */
.task-line.subtask .line-number {
    color: var(--text-3);
}

/* 主次弱提示：仅当主任务【未选中】（即子任务被选中定位到本组）时，
   主任务行极淡绿底——'主'的区域暗示；主任务自己选中时保留正常选中高亮 */
.task-line.group-leader:not(.selected) {
    background: rgba(89, 217, 138, 0.035);
}

.task-line.completed {
    opacity: 0.6;
}

.task-line.completed .task-title {
    text-decoration: line-through;
    color: var(--text-dim);
}

.line-number {
    width: 40px;
    text-align: right;
    color: var(--ln);
    font-size: 12px;
    margin-right: 8px;
    user-select: none;
    flex-shrink: 0;
}

.task-line.selected .line-number {
    color: var(--ln-selected);
}

.line-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
}

.status-indicator {
    width: 2ch;
    flex-shrink: 0;
    text-align: center;
    font-size: 12px;
    line-height: 1;
    color: var(--text-dim);
}

.status-indicator.done {
    color: var(--check);
    font-weight: 700;
}

.flag-indicator {
    color: var(--flag);
    margin-left: auto;
    width: 14px;
    flex-shrink: 0;
    font-size: 12px;
    line-height: 1;
}

.priority-indicator {
    font-size: 10px;
    font-weight: bold;
    width: 3ch;
    text-align: center;
    white-space: nowrap;
    flex-shrink: 0;
}

.priority-high {
    color: var(--p1);
}

.priority-medium {
    color: var(--p2);
}

.priority-low {
    color: var(--p3);
}

.editing-inline {
    flex: 1;
}

.title-editor {
    background: var(--bg-input);
    border: 1px solid var(--border-strong);
    color: var(--text);
    padding: 2px 4px;
    border-radius: 2px;
    font-family: inherit;
    font-size: inherit;
    width: 100%;
    min-width: 200px;
    box-sizing: border-box;
}

.title-editor:focus {
    outline: none;
    border-color: var(--title-editor-focus);
    background: var(--bg-content);
}

.task-title {
    color: var(--text);
    flex: 1;
    min-width: 0;
    word-wrap: break-word;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.task-title :deep(mark) {
    background: var(--accent);
    color: var(--accent-contrast);
    border-radius: 2px;
    padding: 0 1px;
}

/* 元信息行：内容区之后常驻显示，与内容区同左缩进 */
.task-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin: 0 8px 4px 58px;
    padding: 0 14px;
    font-size: 11px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
    color: var(--text-3);
}

.meta-tags {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
}

.meta-tag {
    color: var(--tag);
    font-size: 11px;
}

.meta-schedule {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--schedule);
    font-size: 12px;
    white-space: nowrap;
}

/* 日程提醒状态色（柔和色相，可区分但不扎眼）：
   today=今天（柔绿）/ overdue=过期（柔红）/
   upcoming=未来7天内（柔琥珀）/ normal=远期（灰） */
.meta-schedule.sch-today {
    color: #7fbd90;
}
.meta-schedule.sch-overdue {
    color: #d99a9a;
}
.meta-schedule.sch-upcoming {
    color: #c9b576;
}

.config-input-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 0;
}

.config-input-icon {
  font-size: 13px;
  flex-shrink: 0;
}

.config-input {
  flex: 1;
  padding: 4px 10px;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: var(--surface-input);
  color: var(--text);
  font-size: 13px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  min-width: 0;
  box-shadow: 0 0 0 2px var(--input-focus);
}

.config-input::placeholder {
  color: var(--text-3);
  font-style: italic;
}

.config-input:focus {
  outline: none;
}

/* Config panel */
.config-panel {
  margin: 2px 8px 6px 58px;
  padding: 8px 12px;
  background: var(--config-bg);
  border: 1px solid var(--config-border);
  border-radius: 6px;
  animation: cfgIn 0.15s var(--ease);
}

/* 面板标题条：等宽加粗、底部细分隔线，图标用对应符号色 */
.config-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--config-border);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.config-header-icon {
  width: 18px;
  text-align: center;
  font-size: 13px;
}

.config-header-icon.cfg-schedule { color: var(--schedule); }
.config-header-icon.cfg-priority { color: var(--p2); }
.config-header-icon.cfg-tags { color: var(--tag); }

.config-header-title {
  color: var(--text);
}

.config-header-phase {
  margin-left: auto;
  font-size: 10px;
  font-weight: 400;
  color: var(--mode-lastline);
  letter-spacing: 0.08em;
  padding: 0 6px;
  border: 1px solid var(--border);
  border-radius: 3px;
}

@keyframes cfgIn {
  from { opacity: 0; transform: translateY(-3px); }
  to { opacity: 1; transform: none; }
}

.config-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.config-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 5px;
  background: var(--pill-bg);
  border: 1px solid transparent;
  font-size: 12px;
  font-family: var(--ui);
  color: var(--text-2);
  transition: background 100ms, color 100ms;
  cursor: default;
}

.config-pill:hover {
  background: var(--pill-hover);
  color: var(--text);
}

.config-pill-enter {
  background: var(--accent-dim);
  color: var(--accent-bright);
}

.config-pill kbd {
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--pill-kbd-bg);
  color: var(--text-3);
}

.config-pill-enter kbd {
  background: var(--pill-enter-kbd-bg);
  color: var(--pill-enter-kbd-fg);
}

.priority-p1 { color: var(--pill-p1-fg); background: var(--pill-p1-bg); }
.priority-p1:hover { background: var(--pill-p1-hover); }
.priority-p2 { color: var(--pill-p2-fg); background: var(--pill-p2-bg); }
.priority-p2:hover { background: var(--pill-p2-hover); }
.priority-p3 { color: var(--pill-p3-fg); background: var(--pill-p3-bg); }
.priority-p3:hover { background: var(--pill-p3-hover); }

.config-footer {
  margin-top: 7px;
  padding-top: 6px;
  border-top: 1px solid var(--config-footer-border);
  font-size: 10px;
  font-family: var(--ui);
  color: var(--text-3);
  display: flex;
  align-items: center;
  gap: 4px;
}

.config-tags-display {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.config-tag {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--accent-dim);
  color: var(--accent-bright);
  font-size: 12px;
  font-family: var(--ui);
  border: 1px solid transparent;
}

/* 序号前缀：提示 d+序号 的删除目标编号 */
.config-tag-idx {
  color: var(--text-3);
  font-family: var(--mono);
  font-size: 10px;
  margin-right: 5px;
}

.config-tag-name {
  color: var(--accent-bright);
}

.config-tag-x {
  color: var(--p2);
  font-weight: 700;
  margin-right: 3px;
}

/* 删除待确认高亮：琥珀虚线框 + 底色，让用户清楚即将删除哪一个 */
.config-tag-del {
  border: 1px dashed var(--p2);
  background: rgba(210, 153, 34, 0.16);
}

.config-tags-hint {
  margin-top: 6px;
  color: var(--text-3);
  font-size: 10px;
  font-family: var(--mono);
}

.config-empty-hint {
  color: var(--text-3);
  font-size: 12px;
  font-family: var(--ui);
  align-self: center;
}

.config-footer :deep(kbd) {
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--config-kbd-bg);
  color: var(--config-kbd-fg);
  margin: 0 1px;
}

.expired-indicator {
    color: var(--p1);
    font-size: 11px;
    font-style: italic;
}
</style>
