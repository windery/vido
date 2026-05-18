<template>
    <div class="task-content-area" :class="{ 'show': task.selected }">
        <div v-if="task.status === TaskState.CONTENT_EDITING || task.status === TaskState.CONTENT_NAVIGATION"
            class="content-editing">
            <textarea :ref="(el) => setContentEditRef(el as HTMLTextAreaElement, task.id)" :value="task.content"
                @input="handleInput" @keyup="handleCursorUpdate" @click="handleCursorUpdate"
                @keydown="handleContentKeydown"
                :class="['content-editor', { 'content-nav': task.status === TaskState.CONTENT_NAVIGATION }]"
                :readonly="task.status === TaskState.CONTENT_NAVIGATION"
                placeholder="# Task content (markdown supported)">
      </textarea>
        </div>

        <div v-else-if="task.status === TaskState.SELECTED || task.status === TaskState.VIEWING || task.status === TaskState.TITLE_EDITING"
            class="content-display">
            <div v-if="task.content" class="markdown-display">
                <div v-html="renderMarkdown(task.content)"></div>
            </div>
            <div v-else class="empty-content-hint">
                <span class="hint-text">Press 'i' to add content</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue';
import { Task, TaskState } from '../domain/task';
import { marked } from 'marked';

interface Props {
    task: Task;
}

interface Emits {
    (e: 'cursor-update', event: Event): void;
    (e: 'content-keydown', event: KeyboardEvent): void;
    (e: 'content-input', value: string): void;
    (e: 'textarea-ref', taskId: number, textarea: HTMLTextAreaElement | null): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 用于存储内容编辑textarea的ref
const contentEditRefs = ref<Map<number, HTMLTextAreaElement>>(new Map());

// 设置内容编辑textarea的ref
const setContentEditRef = (el: HTMLTextAreaElement | null, taskId: number) => {
    if (el) {
        contentEditRefs.value.set(taskId, el);
        // 立即调整高度
        nextTick(() => {
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        });
    } else {
        contentEditRefs.value.delete(taskId);
    }

    // 通知父组件注册这个textarea引用
    emit('textarea-ref', taskId, el);
};

const handleInput = (event: Event) => {
    const target = event.target as HTMLTextAreaElement;
    emit('content-input', target.value);
    adjustHeight(target);
};

const handleCursorUpdate = (event: Event) => {
    emit('cursor-update', event);
};

const handleContentKeydown = (event: KeyboardEvent) => {
    emit('content-keydown', event);
};

const adjustHeight = (textarea?: HTMLTextAreaElement) => {
    const targetTextarea = textarea || contentEditRefs.value.get(props.task.id);
    if (targetTextarea) {
        targetTextarea.style.height = 'auto';
        targetTextarea.style.height = `${targetTextarea.scrollHeight}px`;
    }
};

const renderMarkdown = (content: string) => {
    const result = marked(content);
    return typeof result === 'string' ? result : result.toString();
};

onMounted(() => {
    nextTick(() => {
        adjustHeight();
    });
});
</script>

<style scoped>
.task-content-area {
    margin-left: 52px;
    margin-top: 4px;
    padding: 8px 12px;
    background: #1a1a1a;
    border-radius: 4px;
    border-left: 3px solid #4fc1ff;
    opacity: 0;
    max-height: 0;
    overflow: hidden;
    transition: opacity 0.1s ease, max-height 0.15s ease, padding 0.1s ease;
}

.task-content-area.show {
    opacity: 1;
    max-height: 500px;
}

.content-editor {
    background: #1a1a1a;
    border: none;
    color: #d4d4d4;
    padding: 8px 12px;
    font-family: inherit;
    font-size: inherit;
    resize: none;
    width: 100%;
    line-height: 1.6;
    box-sizing: border-box;
    overflow: hidden;
    height: auto;
}

.content-editor:focus {
    outline: none;
    background: #1a1a1a;
}

.content-editor::placeholder {
    color: #6e7681;
    font-style: italic;
}

.content-editor.content-nav {
    background: #1a1a1a;
    cursor: text;
    caret-color: transparent;
    /* 隐藏真实光标 */
}

.content-editor.content-nav::selection {
    background-color: #264f78;
    color: #ffffff;
}

.markdown-display {
    padding: 8px 12px;
    width: 100%;
    color: #d4d4d4;
    line-height: 1.6;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
}

.markdown-display h1,
.markdown-display h2,
.markdown-display h3 {
    color: #ffffff;
    margin: 8px 0;
    font-weight: bold;
}

.markdown-display code {
    background: #3c3c3c;
    color: #f9e79f;
    padding: 2px 4px;
    border-radius: 2px;
    font-family: inherit;
}

.markdown-display strong {
    color: #ffffff;
    font-weight: bold;
}

.markdown-display em {
    color: #79c0ff;
    font-style: italic;
}

.markdown-display p {
    margin: 8px 0;
}

.empty-content-hint {
    padding: 8px 12px;
    color: #6e7681;
    font-style: italic;
}
</style>
