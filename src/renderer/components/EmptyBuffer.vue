<template>
    <!-- 空态：居中提示「No tasks / Press ? for help」；搜索无结果给 vim E486 错误样式 -->
    <div class="empty-buffer">
        <div v-if="isSearching" class="vim-error">E486: Pattern not found: {{ searchTerm }}</div>
        <div v-else class="empty-hint">
            <div class="no-tasks">No tasks</div>
            <div class="help-line">Press <span class="wk">?</span> for help</div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    isSearching: boolean;
    searchTerm?: string;
}

defineProps<Props>();
</script>

<style scoped>
/* 空态容器：占满内容区，垂直水平居中 */
.empty-buffer {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

/* 空态提示：两行居中——无任务 + 按 ? 获取帮助 */
.empty-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.no-tasks {
    font-size: 14px;
    color: var(--text-dim);
}

.help-line {
    font-size: 12px;
    color: var(--text-dim);
}

.wk {
    color: var(--accent-bright);
    font-weight: 600;
}

/* vim 错误信息：红底反白块（ANSI 红语义：无匹配） */
.vim-error {
    background: var(--p1);
    color: #ffffff;
    font-size: 12px;
    line-height: 1.6;
    padding: 0 8px;
    white-space: nowrap;
}
</style>
