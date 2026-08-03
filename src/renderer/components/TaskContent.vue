<template>
    <!-- 仅当选中的任务有内容（或正在编辑内容）时才渲染；vim-instant，无动画 -->
    <div v-if="task.selected && (task.content || isEditing())" class="task-content-area">
        <div v-if="isEditing()" class="content-editing">
            <!-- 不用 readonly：readonly 元素不渲染 caret，导致导航态块光标不显示。导航态禁止输入靠 keydown 拦截 + input 回滚 -->
            <textarea :ref="(el) => setContentEditRef(el as HTMLTextAreaElement, task.id)" :value="task.content"
                @input="handleInput" @keyup="handleCursorUpdate"
                @keydown="handleContentKeydown"
                :class="['content-editor', { 'content-nav': task.status === TaskState.CONTENT_NAVIGATION }]"
                :placeholder="t('content.placeholder')">
      </textarea>
        </div>

        <div v-else class="content-display">
            <div class="markdown-display">
                <div v-html="renderMarkdown(task.content)"></div>
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

// 内容编辑/导航态：选中任务处于编辑中时必须显示 textarea（即便内容为空）
const isEditing = () =>
    props.task.status === TaskState.CONTENT_EDITING || props.task.status === TaskState.CONTENT_NAVIGATION;

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
    margin: 2px 8px 4px 58px;
    padding: 12px 14px;
    background: var(--bg-content);
    border: 1px solid var(--border);
    border-left: 2px solid var(--accent);
    border-radius: 6px;
    box-sizing: border-box;
    box-shadow: inset 0 1px 0 var(--border-soft);
    max-height: 60vh;
    overflow: hidden;
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
    overflow-x: hidden;
    overflow-y: auto;
    max-height: calc(60vh - 24px);
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
    /* vim 风格块光标：原生闪烁块光标（caret-shape: block，Chromium 121+） */
    caret-color: var(--accent);
    caret-shape: block;
}

.markdown-display {
    padding: 0;
    width: 100%;
    color: var(--text);
    line-height: 1.65;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
    max-height: calc(60vh - 24px);
    overflow-y: auto;
}

.markdown-display :deep(h1),
.markdown-display :deep(h2),
.markdown-display :deep(h3) {
    color: var(--markdown-heading);
    margin: 10px 0 6px;
    font-weight: 600;
    line-height: 1.3;
}

.markdown-display :deep(h1) {
    font-size: 1.3em;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border-soft);
}

.markdown-display :deep(h2) {
    font-size: 1.15em;
}

.markdown-display :deep(h3) {
    font-size: 1.05em;
}

.markdown-display :deep(code) {
    background: var(--bg-markdown-code);
    color: var(--code-color);
    padding: 1px 5px;
    border-radius: 3px;
    font-family: var(--mono);
    font-size: 0.92em;
}

.markdown-display :deep(pre) {
    background: var(--code-bg);
    border: 1px solid var(--border-soft);
    border-radius: 4px;
    padding: 10px 12px;
    margin: 8px 0;
    overflow-x: auto;
    white-space: pre;
}

.markdown-display :deep(pre code) {
    background: transparent;
    padding: 0;
    border-radius: 0;
    font-size: 1em;
    color: var(--text);
}

.markdown-display :deep(strong) {
    color: var(--markdown-strong);
    font-weight: bold;
}

.markdown-display :deep(em) {
    color: var(--markdown-em);
    font-style: italic;
}

.markdown-display :deep(p) {
    margin: 6px 0;
}

.markdown-display :deep(blockquote) {
    border-left: 2px solid var(--border-strong);
    margin: 8px 0;
    padding: 2px 0 2px 12px;
    color: var(--text-muted);
}

.markdown-display :deep(ul),
.markdown-display :deep(ol) {
    margin: 6px 0;
    padding-left: 24px;
}

.markdown-display :deep(li) {
    margin: 3px 0;
}

.markdown-display :deep(hr) {
    border: none;
    border-top: 1px solid var(--border);
    margin: 14px 0;
}

.markdown-display :deep(a) {
    color: var(--link);
}
</style>
