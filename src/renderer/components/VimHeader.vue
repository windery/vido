<template>
    <div class="vim-header">
        <div class="file-info">
            <span class="logo">vido<span class="logo-caret">▮</span></span>
            <span class="file-name">{{ t('header.title') }}</span>
            <span class="file-status">{{ currentTime }}</span>
        </div>
        <div class="header-right">
            <div class="stats">
                <span class="stat-block">
                    <span class="stat-num">{{ filteredTasksCount }}</span>
                    <span class="stat-label">{{ t('header.tasks', { n: filteredTasksCount }) }}</span>
                </span>
                <span class="stat-block stat-done-block">
                    <span class="stat-num">{{ completedTasksCount }}<span class="stat-sep">/</span>{{ filteredTasksCount }}</span>
                    <span class="stat-label stat-done-label">{{ t('header.done', { done: completedTasksCount, total: filteredTasksCount }) }}</span>
                </span>
            </div>
            <div class="progress" role="img" :aria-label="progressLabel">
                <span class="progress-blocks">
                    <span v-for="(on, i) in blockStates" :key="i" :class="on ? 'on' : 'off'">{{ on ? '▰' : '▱' }}</span>
                </span>
                <span class="progress-count">{{ completedTasksCount }}/{{ filteredTasksCount }}</span>
            </div>
            <div class="header-actions">
                <button type="button" class="hdr-btn" :title="t('header.themeBtn')" @click="toggleTheme">{{ themeIcon }}</button>
                <button type="button" class="hdr-btn" :title="t('header.langBtn')" @click="toggleLang">{{ langIcon }}</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { prefs, toggleTheme, toggleLang } from '../domain/state/prefs';
import { t } from '../i18n';

const PROGRESS_BLOCKS = 10;

interface Props {
    filteredTasksCount: number;
    completedTasksCount: number;
}

const props = defineProps<Props>();

const now = ref(new Date());
let timeInterval: ReturnType<typeof setInterval> | null = null;

const currentTime = computed(() => {
    return now.value.toLocaleString(prefs.lang === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
});

const themeIcon = computed(() => (prefs.theme === 'dark' ? '☾' : '☀'));
const langIcon = computed(() => (prefs.lang === 'zh' ? '中' : 'EN'));

const blockStates = computed(() => {
    const total = props.filteredTasksCount;
    const done = props.completedTasksCount;
    const filled = total > 0 ? Math.round((done / total) * PROGRESS_BLOCKS) : 0;
    return Array.from({ length: PROGRESS_BLOCKS }, (_, i) => i < filled);
});

const progressLabel = computed(() => `${props.completedTasksCount}/${props.filteredTasksCount} done`);

onMounted(() => {
    const update = () => { now.value = new Date(); };
    update();
    timeInterval = setInterval(update, 60000);
});

onUnmounted(() => {
    if (timeInterval !== null) {
        clearInterval(timeInterval);
        timeInterval = null;
    }
});
</script>

<style scoped>
/* Terminal Purist header */
.vim-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    height: 46px;
    padding: 0 18px;
    flex-shrink: 0;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    border-radius: 4px 4px 0 0;
    font-size: 12px;
    color: var(--text-header);
    user-select: none;
    box-sizing: border-box;
}

.file-info {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.logo {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-weight: 700;
    font-size: 15px;
    letter-spacing: 0.04em;
    color: var(--text-bright);
    background: var(--accent-dim);
    border: 1px solid var(--logo-border);
    padding: 2px 8px;
    border-radius: 5px;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
}

.logo-caret {
    color: var(--accent-bright);
    line-height: 1;
    margin-left: 2px;
    animation: logoBlink 1.06s step-end infinite;
}

@keyframes logoBlink {
    50% { opacity: 0; }
}

.file-name {
    color: var(--text-bright);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.file-status {
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
}

.stats {
    display: flex;
    align-items: center;
    gap: 16px;
    color: var(--text-muted);
}

.stat-block {
    display: flex;
    align-items: center;
    gap: 7px;
}

.stat-num {
    color: var(--text);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.stat-sep {
    color: var(--text-faint);
    font-weight: 400;
}

.stat-label {
    white-space: nowrap;
}

.progress {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-size: 12px;
    line-height: 1;
}

.progress-blocks {
    letter-spacing: 1px;
    white-space: nowrap;
}

.progress-blocks .on {
    color: var(--accent);
}

.progress-blocks .off {
    color: var(--ln);
    opacity: 0.65;
}

.progress-count {
    color: var(--text-dim);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
}

.header-actions {
    display: flex;
    gap: 6px;
}

.hdr-btn {
    pointer-events: auto;
    cursor: pointer;
    min-width: 28px;
    height: 26px;
    padding: 0 6px;
    border: 1px solid var(--border);
    border-radius: 5px;
    background: transparent;
    color: var(--text-header);
    font-size: 13px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.hdr-btn:hover {
    background: var(--surface-active);
    border-color: var(--accent);
    color: var(--text-bright);
}

.hdr-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}

.hdr-btn:active {
    transform: translateY(1px);
}
</style>
