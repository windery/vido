<template>
    <div class="vim-header">
        <div class="file-info">
            <span class="logo"><span class="logo-caret">❯</span>vido</span>
            <span class="file-status">{{ currentTime }}</span>
        </div>
        <div class="header-right">
            <div class="stats">
                <span class="stat-block">
                    <span class="stat-num">{{ filteredTasksCount }}</span>
                    <span class="stat-label">{{ t('header.tasks') }}</span>
                </span>
                <span class="stat-block stat-done-block">
                    <span class="stat-num">{{ completedTasksCount }}<span class="stat-sep">/</span>{{ filteredTasksCount }}</span>
                    <span class="stat-label stat-done-label">{{ t('header.done') }}</span>
                </span>
            </div>
            <div class="progress" role="img" :aria-label="progressLabel">
                <span class="progress-blocks">
                    <span v-for="(on, i) in blockStates" :key="i" :class="on ? 'on' : 'off'">{{ on ? '▰' : '▱' }}</span>
                </span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
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
    return now.value.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
});

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
    font-size: 14px;
    letter-spacing: 0.08em;
    color: var(--accent-bright);
    background: var(--accent-dim);
    border: 1px solid rgba(89, 217, 138, 0.32);
    box-shadow: 0 0 8px rgba(89, 217, 138, 0.12);
    padding: 3px 10px 3px 8px;
    border-radius: 5px;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    user-select: none;
}

/* 终端提示符 ❯：磷光绿、略暗于主文字，形成纵深 */
.logo-caret {
    color: var(--accent);
    opacity: 0.85;
    font-size: 12px;
    margin-right: 5px;
    letter-spacing: 0;
    transform: translateY(-0.5px);
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

</style>
