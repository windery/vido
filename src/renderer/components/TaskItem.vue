<template>
    <div class="task-container" :data-task-id="task.id">
        <!-- Task line -->
        <div :class="['task-line', {
            'selected': task.selected,
            'completed': task.completed,
            'editing': task.status === TaskState.CONTENT_EDITING || task.status === TaskState.TITLE_EDITING
        }]" @click="handleRowClick">
            <span class="line-number">{{ index + 1 }}</span>

            <!-- Task content in vim style -->
            <div class="line-content">
                <span class="task-status">{{ task.completed ? '✓' : '○' }}</span>
                <span :class="['priority-indicator', getPriorityClass(task.priority)]">{{ task.priority }}</span>

                <span v-if="task.status === TaskState.TITLE_EDITING && task.selected" class="editing-inline">
                    <input ref="titleEditRef" :value="task.title" class="title-editor" @input="handleTitleInput"
                        @keydown="handleTitleKeydown" @blur="stopTitleEditing" @keydown.enter="stopTitleEditing"
                        @keydown.esc="stopTitleEditing" @compositionstart="handleCompositionStart"
                        @compositionend="handleCompositionEnd" />
                </span>
                <span v-else class="task-title" @dblclick="startTaskTitleEditing">
                    {{ task.title || '[No title]' }}
                </span>

                <span v-if="task.tags && task.tags.length > 0" class="inline-tags">
                    <span v-for="tag in task.tags" :key="tag" class="inline-tag">#{{ tag }}</span>
                </span>

                <span v-if="task.schedule" class="schedule-indicator">
                    <span class="schedule-text">
                        📅{{ getScheduleDisplayText(task.schedule) }}
                    </span>
                    <span v-if="isScheduleExpired(task.schedule)" class="expired-indicator">
                        (已过期)
                    </span>
                </span>
            </div>
        </div>

        <!-- Task Content Component -->
        <TaskContent v-if="task.selected && task.id" :task="task" @cursor-update="handleCursorUpdate"
            @content-keydown="handleContentKeydown" @content-input="handleContentInput"
            @textarea-ref="handleTextareaRef" />

        <!-- Hint bar: cc/cs/cp/ct 时出现，操作引导 -->
        <div v-if="task.isConfigExpanded" class="hint-bar">
          <span v-if="task.focusedConfigItem === 0">📅</span>
          <span v-else-if="task.focusedConfigItem === 1">⚡</span>
          <span v-else-if="task.focusedConfigItem === 2">🏷</span>
          {{ hintText }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watchEffect, computed } from 'vue';
import { Task, TaskState, TaskPriority } from '../domain/task';
import { getScheduleDisplayText, isScheduleExpired } from '../utils/schedule-helper';
import TaskContent from './TaskContent.vue';
import { useTaskState } from '../composables/use-task-state';

interface Props {
    task: Task;
    index: number;
}

interface Emits {
    (e: 'row-click', task: Task): void;
    (e: 'start-title-editing', task: Task): void;
    (e: 'title-input', value: string, task: Task): void;
    (e: 'cursor-update', event: Event, task: Task): void;
    (e: 'content-keydown', event: KeyboardEvent, task: Task): void;
    (e: 'content-input', value: string, task: Task): void;
    (e: 'textarea-ref', taskId: number, textarea: HTMLTextAreaElement | null): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const titleEditRef = ref<HTMLInputElement | null>(null);

// 输入法组合状态追踪
const isComposing = ref(false);

const handleRowClick = () => {
    emit('row-click', props.task);
};

const startTaskTitleEditing = () => {
    emit('start-title-editing', props.task);
    nextTick(() => {
        titleEditRef.value?.focus();
    });
};

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

// hint-bar 文本
const hintText = computed(() => {
  const focus = props.task.focusedConfigItem ?? -1;
  switch (focus) {
    case 0: return '1 今天  2 明天  3 下周  4 自定义  5 清除  Enter 输入';
    case 1: return '1 P1  2 P2  3 P3  j/k 切换';
    case 2: return '输入字符添加标签';
    default: return 'cs 日程  cp 优先级  ct 标签  h/l 切换';
  }
});

const getPriorityClass = (priority?: TaskPriority) => {
    switch (priority) {
        case TaskPriority.HIGH:
            return 'priority-high';
        case TaskPriority.MEDIUM:
            return 'priority-medium';
        case TaskPriority.LOW:
            return 'priority-low';
        default:
            return 'priority-medium';
    }
};

// formatDate函数已移除，使用schedule-helper中的函数

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
    display: flex;
    min-height: 24px;
    padding: 4px 12px;
    cursor: pointer;
    box-sizing: border-box;
    border-radius: 2px;
    margin-bottom: 2px;
}

.task-line:hover {
    background: #2a2d2e;
}

.task-line.selected {
    background: #264f78;
    color: #ffffff;
}

.task-line.completed {
    opacity: 0.6;
}

.task-line.completed .task-title {
    text-decoration: line-through;
    color: #6e7681;
}

.line-number {
    width: 40px;
    text-align: right;
    color: #6e7681;
    font-size: 12px;
    margin-right: 12px;
    user-select: none;
    flex-shrink: 0;
}

.line-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
}

.task-status {
    color: #4fc1ff;
    font-weight: bold;
    width: 16px;
    flex-shrink: 0;
}

.priority-indicator {
    font-size: 10px;
    font-weight: bold;
    width: 24px;
    text-align: center;
    flex-shrink: 0;
}

.priority-high {
    color: #f85149;
}

.priority-medium {
    color: #d29922;
}

.priority-low {
    color: #3fb950;
}

.editing-inline {
    flex: 1;
}

.title-editor {
    background: #3c3c3c;
    border: 1px solid #5a5a5a;
    color: #d4d4d4;
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
    border-color: #007acc;
    background: #1e1e1e;
}

.task-title {
    color: #d4d4d4;
    flex: 1;
    min-width: 0;
    word-wrap: break-word;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.task-title:hover {
    color: #ffffff;
}

.inline-tags {
    display: flex;
    gap: 4px;
    margin-left: 8px;
}

.inline-tag {
    color: #79c0ff;
    font-size: 12px;
}

.hint-bar {
  padding: 2px 12px 4px 68px;
  font-size: 11px;
  font-family: system-ui, -apple-system, sans-serif;
  color: #666;
}

.schedule-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
}

.schedule-text {
    color: #7dd3fc;
    font-size: 12px;
}

.expired-indicator {
    color: #f85149;
    font-size: 11px;
    font-style: italic;
}
</style>
