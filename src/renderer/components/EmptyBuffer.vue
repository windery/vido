<template>
    <!-- vim 空 buffer：行号 + ~；下方 vim 启动屏风格欢迎信息（对齐列、无卡片框） -->
    <div class="empty-buffer">
        <div v-for="n in 8" :key="n" class="empty-line">
            <span class="line-number">{{ n }}</span>
            <span class="vim-tilde">~</span>
        </div>

        <!-- 搜索无结果：vim 错误信息样式（红底反白块），直接给出 E486 语义 -->
        <div v-if="isSearching" class="empty-line">
            <span class="line-number">9</span>
            <span class="vim-error">E486: Pattern not found: {{ searchTerm }}</span>
        </div>

        <!-- 空列表：vim 欢迎屏——品牌 + 版本 + 键位列对齐 -->
        <div v-else class="welcome">
            <div class="welcome-brand">
                <span class="brand-caret">❯</span>vido<span class="welcome-version">version {{ version }}</span>
            </div>
            <div class="welcome-sub">vim-style todo manager for programmers</div>
            <div class="welcome-keys">
                <div class="welcome-row">
                    <span class="wk">o</span><span class="wd">new task</span>
                    <span class="wk">i</span><span class="wd">edit content</span>
                </div>
                <div class="welcome-row">
                    <span class="wk">O</span><span class="wd">new task above</span>
                    <span class="wk">/</span><span class="wd">search</span>
                </div>
                <div class="welcome-row">
                    <span class="wk">Space</span><span class="wd">toggle done</span>
                    <span class="wk">:</span><span class="wd">command</span>
                </div>
                <div class="welcome-row">
                    <span class="wk">dd</span><span class="wd">delete task</span>
                    <span class="wk">?</span><span class="wd">help</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    isSearching: boolean;
    searchTerm?: string;
}

defineProps<Props>();

/** 应用版本（vite define 注入，见 vite.config.ts） */
const version = import.meta.env.VITE_APP_VERSION as string;
</script>

<style scoped>
/* Empty buffer with vim tildes */
.empty-buffer {
    padding: 26px 8px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.empty-line {
    display: flex;
    align-items: center;
    min-height: 22px;
    padding: 0 8px;
}

.line-number {
    width: 40px;
    text-align: right;
    color: var(--ln);
    font-size: 12px;
    margin-right: 12px;
    user-select: none;
    flex-shrink: 0;
}

.vim-tilde {
    color: var(--text-3);
    font-weight: bold;
}

/* vim 错误信息：红底反白块（ANSI 红语义：无匹配） */
.vim-error {
    background: var(--p1);
    color: #ffffff;
    font-size: 12px;
    line-height: 1.6;
    padding: 0 6px;
    white-space: nowrap;
}

/* 欢迎区：与 ~ 列对齐（行号 40 + 间距 12 + padding 8），无边框无卡片 */
.welcome {
    margin-top: 16px;
    margin-left: 60px;
}

.welcome-brand {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--accent-bright);
}

.brand-caret {
    color: var(--accent);
    margin-right: 5px;
    font-size: 12px;
}

.welcome-version {
    margin-left: 12px;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0;
    color: var(--text-faint);
}

.welcome-sub {
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-dim);
}

.welcome-keys {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 7px;
}

/* 键位列对齐：键名 64px 定宽 + 描述自适应，两对一行的信息列 */
.welcome-row {
    display: grid;
    grid-template-columns: 64px 1fr 64px 1fr;
    column-gap: 8px;
    max-width: 540px;
    font-size: 12px;
}

.wk {
    color: var(--accent-bright);
    font-weight: 600;
}

.wd {
    color: var(--text-2);
}
</style>
