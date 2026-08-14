<template>
    <div class="calendar-view">
        <!-- 头部：粒度徽章 + 范围 + 基本键位（详细按 ?） -->
        <div class="calendar-header">
            <span class="cal-badge">{{ granularity.toUpperCase() }}</span>
            <span class="cal-range">{{ rangeLabel }}</span>
            <span class="cal-hint">[ ] page &nbsp;·&nbsp; H/L view &nbsp;·&nbsp; ? keys</span>
        </div>

        <!-- 按日期分组的任务：month 只显示有任务的日期（紧凑），day/week 显示全范围 -->
        <div class="calendar-body">
            <div v-for="day in days" :key="day.date" class="cal-day">
                <div class="cal-day-head">
                    <span class="cal-weekday">{{ weekdayName(day.date) }}</span>
                    <span class="cal-date" :class="{ 'is-today': day.date === todayStr }">{{ day.date }}</span>
                    <span v-if="day.date === todayStr" class="cal-today-flag">TODAY</span>
                </div>
                <div class="cal-day-tasks">
                    <div v-for="t in day.tasks" :key="t.id" class="cal-task"
                        :class="{ done: t.completed, selected: day.date === selectedDate && t.id === selectedTaskId }">
                        <span class="cal-task-dot">{{ t.completed ? '✓' : '○' }}</span>
                        <span class="cal-task-title">{{ t.title }}</span>
                    </div>
                </div>
            </div>
            <div v-if="days.length === 0" class="cal-empty">
                No tasks in this {{ granularity }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, watch, nextTick } from 'vue';
import type { Task } from '../domain/task';
import { collectTasksInRange, getCalendarRange, weekdayName } from '../utils/calendar';
import { formatDate } from '../utils/date-formatter';

const props = defineProps<{
    tasks: Task[];
    granularity: 'day' | 'week' | 'month';
    anchor: string;
    selectedDate?: string;
    selectedTaskId?: number;
}>();

const todayStr = formatDate(new Date());

const rangeLabel = computed(() => getCalendarRange(props.granularity, props.anchor).label);

// month 粒度只显示有任务的日期（紧凑）；day/week 显示全范围
const days = computed(() => {
    const all = collectTasksInRange(props.tasks, props.granularity, props.anchor);
    if (props.granularity !== 'month') return all;
    return all.filter((d) => d.tasks.length > 0);
});

// 选中变化时把目标行滚入视口（vim-instant：同一帧、最小滚动）
watch(
    () => `${props.selectedDate}:${props.selectedTaskId}`,
    () => {
        nextTick(() => {
            const el = document.querySelector('.cal-task.selected');
            el?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        });
    }
);
</script>

<style scoped>
.calendar-view {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 2px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.calendar-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--border-soft);
    font-size: 12px;
    color: var(--text-dim);
}

.cal-badge {
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--accent);
    font-size: 11px;
    border: 1px solid rgba(89, 217, 138, 0.35);
    padding: 1px 6px;
    border-radius: 3px;
}

.cal-range {
    color: var(--text-bright);
    font-weight: 600;
}

.cal-hint {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-3);
}

.cal-day {
    border: 1px solid var(--border-soft);
    border-radius: 4px;
    margin-bottom: 2px;
}

.cal-day-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid var(--border-soft);
    font-size: 12px;
}

.cal-weekday {
    color: var(--text-2);
    width: 32px;
}

.cal-date {
    color: var(--text-bright);
    font-weight: 600;
}

.cal-date.is-today {
    color: var(--accent);
}

.cal-today-flag {
    color: var(--accent);
    font-size: 10px;
    letter-spacing: 0.06em;
    border: 1px solid rgba(89, 217, 138, 0.3);
    padding: 0 4px;
    border-radius: 3px;
}

.cal-day-tasks {
    padding: 2px 0;
}

.cal-task {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 10px;
    font-size: 13px;
    line-height: 1.6;
}

/* 选中行：绿渐变高亮（j/k/Enter 流程的唯一视觉反馈） */
.cal-task.selected {
    background: var(--active-grad);
    color: var(--text-bright);
    border-radius: 3px;
}

.cal-task.selected .cal-task-dot {
    color: var(--accent-bright);
}

.cal-task.done {
    opacity: 0.55;
}

.cal-task.done .cal-task-title {
    text-decoration: line-through;
    color: var(--text-dim);
}

.cal-task-dot {
    color: var(--text-2);
    font-size: 11px;
    width: 12px;
    flex-shrink: 0;
}

.cal-task-title {
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.cal-empty {
    padding: 24px;
    text-align: center;
    color: var(--text-3);
    font-size: 12px;
}
</style>
