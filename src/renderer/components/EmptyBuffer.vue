<template>
    <!-- 空态：居中一条提示（详细命令见 ? 帮助）；搜索无结果给 vim E486 错误样式 -->
    <div class="empty-buffer">
        <div v-if="isSearching" class="vim-error">E486: Pattern not found: {{ searchTerm }}</div>
        <div v-else class="empty-hint">
            <span class="wk">o</span><span class="wd">new task</span>
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
    font-size: 13px;
}

/* 唯一提示：键名磷光绿 + 描述淡灰 */
.empty-hint {
    display: flex;
    align-items: center;
    gap: 10px;
}

.wk {
    color: var(--accent-bright);
    font-weight: 600;
}

.wd {
    color: var(--text-dim);
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
