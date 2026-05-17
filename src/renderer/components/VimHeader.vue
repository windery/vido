<template>
    <div class="vim-header">
        <div class="file-info">
            <span class="file-name">Vido - Vim Todo Manager</span>
            <span class="file-status">{{ getCurrentTime() }}</span>
        </div>
        <div class="stats">
            <span>{{ filteredTasksCount }} tasks</span>
            <span>{{ completedTasksCount }}/{{ filteredTasksCount }} done</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Props {
    filteredTasksCount: number;
    completedTasksCount: number;
}

defineProps<Props>();

const currentTime = ref('');
let timeInterval: ReturnType<typeof setInterval> | null = null;

const updateCurrentTime = () => {
    const now = new Date();
    currentTime.value = now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

const getCurrentTime = () => {
    return currentTime.value;
};

onMounted(() => {
    updateCurrentTime();
    timeInterval = setInterval(updateCurrentTime, 60000);
});

onUnmounted(() => {
    if (timeInterval !== null) {
        clearInterval(timeInterval);
        timeInterval = null;
    }
});
</script>

<style scoped>
/* Vim-style header */
.vim-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background: #2d2d30;
    border-bottom: 1px solid #3e3e42;
    border-radius: 4px 4px 0 0;
    font-size: 12px;
    color: #cccccc;
    min-height: 32px;
}

.file-info {
    display: flex;
    gap: 8px;
}

.file-name {
    color: #ffffff;
    font-weight: 500;
}

.file-status {
    color: #f9e79f;
}

.stats {
    display: flex;
    gap: 16px;
    color: #a5a5a5;
}
</style>