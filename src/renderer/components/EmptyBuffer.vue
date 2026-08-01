<template>
    <div class="empty-buffer">
        <div v-if="isSearching" class="no-results">
            <div class="empty-line">
                <span class="line-number">1</span>
                <span class="no-results-text">{{ t('empty.noResults') }}</span>
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
            <div class="empty-hint">
                {{ t('empty.emptyTitle') }}<br>
                <span class="empty-keys" v-html="t('empty.emptyKeys')"></span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { t } from '../i18n';

interface Props {
    isSearching: boolean;
}

defineProps<Props>();
</script>

<style scoped>
/* Empty buffer with vim tildes */
.empty-buffer {
    padding: 26px 8px;
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

.no-results {
    padding: 26px 8px;
    color: var(--text-3);
    font-style: italic;
}

.no-results-text {
    color: var(--text-3);
    font-style: italic;
    margin-left: 12px;
}

.empty-hint {
    margin-top: 18px;
    padding: 14px 16px;
    border: 1px dashed var(--border);
    border-radius: 8px;
    color: var(--text-2);
    font-size: 13px;
    line-height: 2;
}

.empty-hint :deep(kbd) {
    font-family: var(--mono);
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--surface-2);
    color: var(--accent-bright);
    border: 1px solid var(--border);
}
</style>