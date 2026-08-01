<template>
    <div class="task-content-area" :class="{ 'show': task.selected }">
        <div v-if="task.status === TaskState.CONTENT_EDITING || task.status === TaskState.CONTENT_NAVIGATION"
            class="content-editing">
            <textarea :ref="(el) => setContentEditRef(el as HTMLTextAreaElement, task.id)" :value="task.content"
                @input="handleInput" @keyup="handleCursorUpdate" @click="handleCursorUpdate"
                @keydown="handleContentKeydown"
                :class="['content-editor', { 'content-nav': task.status === TaskState.CONTENT_NAVIGATION }]"
                :readonly="task.status === TaskState.CONTENT_NAVIGATION"
                :placeholder="t('content.placeholder')">
      </textarea>
        </div>

        <div v-else-if="task.status === TaskState.SELECTED || task.status === TaskState.VIEWING || task.status === TaskState.TITLE_EDITING"
            class="content-display">
            <div v-if="task.content" class="markdown-display">
                <div v-html="renderMarkdown(task.content)"></div>
            </div>
            <div v-else class="empty-content-hint">
                <span class="hint-text">{{ t('content.pressI') }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue';
import { Task, TaskState } from '../domain/task';
import { marked } from 'marked';
import { t } from '../i18n';

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
    margin: 2px 8px 4px 70px;
    padding: 9px 12px;
    background: var(--bg-content);
    border: 1px solid var(--border-soft);
    border-left: 3px solid var(--check);
    border-radius: 0 5px 5px 0;
    opacity: 0;
    max-height: 0;
    overflow: hidden;
    transition: opacity 0.15s ease, max-height 0.15s ease, padding 0.1s ease;
}

.task-content-area.show {
    opacity: 1;
    max-height: 500px;
}

.content-editor {
    background: transparent;
    border: none;
    color: var(--text);
    padding: 0;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.65;
    resize: none;
    width: 100%;
    min-height: 24px;
    box-sizing: border-box;
    overflow: hidden;
    height: auto;
    display: block;
    caret-color: var(--accent-bright);
}

.content-editor:focus {
    outline: none;
    background: transparent;
}

.content-editor::placeholder {
    color: var(--text-3);
    font-style: italic;
}

.content-editor.content-nav {
    cursor: text;
    /* vim 风格块光标：由 ::selection 反白当前字符模拟，隐藏原生竖线 caret */
    caret-color: transparent;
}

.content-editor.content-nav::selection {
    background: var(--accent);
    color: var(--nav-sel-fg);
}

.markdown-display {
    padding: 0;
    width: 100%;
    color: var(--text);
    line-height: 1.65;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
}

.markdown-display h1,
.markdown-display h2,
.markdown-display h3 {
    color: var(--markdown-heading);
    margin: 8px 0;
    font-weight: bold;
}

.markdown-display code {
    background: var(--bg-markdown-code);
    color: var(--code-color);
    padding: 2px 4px;
    border-radius: 2px;
    font-family: inherit;
}

.markdown-display strong {
    color: var(--markdown-strong);
    font-weight: bold;
}

.markdown-display em {
    color: var(--markdown-em);
    font-style: italic;
}

.markdown-display p {
    margin: 8px 0;
}

.empty-content-hint {
    padding: 8px 12px;
    color: var(--text-dim);
    font-style: italic;
}
</style>
