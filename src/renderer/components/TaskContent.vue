<template>
    <!-- 仅当选中的任务有内容（或正在编辑内容）时才渲染；vim-instant，无动画 -->
    <div v-if="task.selected && (task.content || isEditing())" class="task-content-area">
        <div v-if="isEditing()" class="content-editing">
            <!-- 导航态 readonly：阻止中文输入法激活（可编辑 textarea 聚焦按字母会弹拼音候选框）。
                 块光标已改自定义镜像层、原生 caret 本就隐藏，readonly 不影响显示；
                 导航移动靠 setSelectionRange（readonly 下仍有效），禁止输入靠 readonly + keydown 拦截 + input 回滚 -->
            <div class="editor-shell">
                <textarea :ref="(el) => setContentEditRef(el as HTMLTextAreaElement, task.id)" rows="1" :value="task.content"
                    :readonly="isNav()" @input="handleInput" @keyup="handleCursorUpdate"
                    @keydown="handleContentKeydown" @scroll="syncScroll" spellcheck="false"
                    :class="['content-editor', { 'content-nav': isNav() }]"
                    :placeholder="t('content.placeholder')">
      </textarea>
                <div v-if="isNav()" class="caret-mirror" aria-hidden="true"
                    :style="{ transform: `translateY(${-scrollTop}px)` }">
                    <span class="mirror-text">{{ caretPrefix }}</span><span class="block-caret">{{ caretChar }}</span>
                </div>
            </div>
            <!-- 导航态次级操作提示：就近展示（help 面板只保留主线操作） -->
            <div v-if="isNav()" class="nav-hint">{{ t('content.navHint') }}</div>
        </div>

        <div v-else class="content-display">
            <div class="markdown-display">
                <div v-html="renderMarkdown(task.content)"></div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, computed, watchEffect } from 'vue';
import { Task, TaskState } from '../domain/task';
import { renderMarkdown } from '../utils/markdown';
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

// 导航态：vim 块光标（镜像层渲染，替代不可靠的原生 caret-shape）
const isNav = () => props.task.status === TaskState.CONTENT_NAVIGATION;

const scrollTop = ref(0);
const syncScroll = (event: Event) => {
    scrollTop.value = (event.target as HTMLTextAreaElement).scrollTop;
};

// 光标前的完整文本（前 cursorLine 行含换行 + 当前行 cursorColumn 前字符），供镜像层对齐
const caretPrefix = computed(() => {
    const content = props.task.content || '';
    const line = props.task.cursorLine ?? 0;
    const col = props.task.cursorColumn ?? 0;
    const lines = content.split('\n');
    let prefix = '';
    for (let i = 0; i < line; i++) prefix += (lines[i] ?? '') + '\n';
    prefix += (lines[line] ?? '').slice(0, col);
    return prefix;
});

// 光标处的字符；行尾/空行为空格，块光标照样显示一个方块（vim 语义：空行有块光标）
const caretChar = computed(() => {
    const content = props.task.content || '';
    const line = props.task.cursorLine ?? 0;
    const col = props.task.cursorColumn ?? 0;
    const lines = content.split('\n');
    const cur = lines[line] ?? '';
    return cur[col] || ' ';
});

// 进入导航/编辑态时同步高度与镜像层滚动偏移：
// textarea 的 CSS height:auto 只显示固有 rows 高度（约 2 行），必须由
// adjustHeight 设 inline height = scrollHeight 撑到内容高度；否则从
// normal（markdown 完整渲染）切到 nav/edit 时内容区明显变矮（跳动）。
// content 依赖收集：dd/x/undo 等非 input 路径的内容变更也会触发重算。
watchEffect(() => {
    void props.task.content; // 响应式依赖：内容变更触发重算
    if (isEditing()) {
        nextTick(() => {
            const ta = contentEditRefs.value.get(props.task.id);
            if (ta) {
                adjustHeight(ta);
                if (isNav()) scrollTop.value = ta.scrollTop;
            }
        });
    }
});

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
    /* 内容高度不做限制：完整展示全部内容，由外层列表容器滚动接管 */
}

/* 字体统一定义在 shell 上：textarea 与镜像层同源继承，保证块光标像素级对齐 */
.editor-shell {
    position: relative;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-size: 13px;
    /* 整数像素行高：textarea 内部行高向上取整（21.45 → 22），
       markdown 亚像素累计（21.45×行数），取整后两态逐行对齐 */
    line-height: 22px;
}

.content-editor {
    background: transparent;
    border: none;
    color: var(--text);
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    resize: none;
    width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
    overflow-y: hidden;
    /* 高度无上限：内容完整展示（adjustHeight 按 scrollHeight 撑高） */
    scrollbar-width: none;
    height: auto;
    display: block;
    caret-color: var(--accent-bright);
}

.content-editor::-webkit-scrollbar {
    display: none;
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
    /* 隐藏原生竖线光标，改由镜像层块光标渲染 */
    caret-color: transparent;
}

/* 导航态次级操作提示行：内容区内的就地提示（等宽、淡灰、细分隔线） */
.nav-hint {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid var(--border-soft);
    font-size: 10px;
    line-height: 1.7;
    color: var(--text-3);
    user-select: none;
}

/* vim 块光标镜像层：透明文本占位 + 块 span 覆盖光标处字符，与 textarea 同排版、随滚动同步 */
.caret-mirror {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    overflow: hidden;
    pointer-events: none;
    user-select: none;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: break-word;
    color: transparent;
    z-index: 1;
}

.mirror-text {
    white-space: pre-wrap;
}

.block-caret {
    display: inline-block;
    background: var(--accent);
    color: var(--accent-contrast);
}

.markdown-display {
    padding: 0;
    width: 100%;
    color: var(--text);
    /* 与编辑器（editor-shell）同源等宽字体/字号：无特殊样式时高度一致，
       切换 normal ⇄ content-nav/edit 内容区不跳动 */
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-size: 13px;
    line-height: 22px;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
    /* 高度无上限：内容完整展示（与 textarea 一致），外层列表容器滚动接管 */
    overflow: visible;
    scrollbar-width: none;
}

.markdown-display::-webkit-scrollbar {
    display: none;
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
    margin: 0;
    padding: 0;
}

/* 段落间距只在相邻段落之间（markdown 多段可读性）；
   单段纯文本零 margin → 与 textarea 高度严格一致 */
.markdown-display :deep(p + p) {
    margin-top: 6px;
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
