<template>
    <div class="empty-buffer">
        <div v-if="isSearching" class="no-results">
            <div class="empty-line">
                <span class="line-number">1</span>
                <span class="no-results-text">No search results found</span>
            </div>
        </div>
        <div v-else>
            <div class="empty-line">
                <span class="line-number">1</span>
                <span class="vim-tilde">~</span>
            </div>
            <div class="empty-line" v-for="n in 15" :key="n">
                <span class="line-number">{{ n + 1 }}</span>
                <span class="vim-tilde">~</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    isSearching: boolean;
}

defineProps<Props>();
</script>

<style scoped>
/* Empty buffer with vim tildes */
.empty-buffer {
    padding: 16px 8px;
}

.empty-line {
    display: flex;
    min-height: 20px;
    padding: 0 8px;
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

.vim-tilde {
    color: #6e7681;
    font-weight: bold;
}

.no-results {
    padding: 8px 0;
}

.no-results-text {
    color: #6e7681;
    font-style: italic;
    margin-left: 12px;
}
</style>