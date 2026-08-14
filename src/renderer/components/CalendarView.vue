<template>
    <div class="calendar-view">
        <!-- 头部：粒度徽章 + 范围（键位不常驻提示，按 ? 查询，与配置面板一致） -->
        <div class="calendar-header">
            <span class="cal-badge">{{ granularity.toUpperCase() }}</span>
            <span class="cal-range">{{ rangeLabel }}</span>
        </div>

        <!-- 当日详情（day 粒度 / 网格内 Enter 打开）：完整任务列表 -->
        <div v-if="showDetail" class="cal-single">
            <div class="cal-cell" :class="{ 'is-today': detailDate === todayStr }">
                <div class="cal-cell-head">
                    <span class="cal-cell-weekday">{{ weekdayName(detailDate) }}</span>
                    <span class="cal-cell-date">{{ detailDate }}</span>
                    <span v-if="detailDate === todayStr" class="cal-today-flag">TODAY</span>
                </div>
                <div class="cal-cell-tasks">
                    <div v-for="t in cellTasks(detailDate)" :key="t.id" class="cal-task"
                        :class="{ done: t.completed, selected: detailDate === selectedDate && t.id === selectedTaskId }">
                        <span class="cal-task-dot">{{ t.completed ? '✓' : '○' }}</span>
                        <span class="cal-task-title">{{ t.title }}</span>
                    </div>
                    <div v-if="cellTasks(detailDate).length === 0" class="cal-cell-empty">No tasks</div>
                </div>
            </div>
        </div>

        <!-- week：当月网格展示（仅当月天数，上/下月不占格），仅当前周（切换范围）正常显示，范围外日期置灰 -->
        <div v-else-if="granularity === 'week'">
            <div class="cal-weekdays">
                <span v-for="w in WEEKDAYS" :key="w" class="cal-weekday-label">{{ w }}</span>
            </div>
            <div class="cal-grid cal-month">
                <div v-for="(c, i) in monthCells" :key="c.date" class="cal-cell"
                    :style="i === 0 ? { gridColumnStart: firstCellColumn } : undefined"
                    :class="{
                        'is-today': c.date === todayStr,
                        'is-out': !weekDates.includes(c.date),
                        'is-focused': c.date === selectedDate,
                    }">
                    <div class="cal-cell-head">
                        <span class="cal-cell-date">{{ c.date.slice(8) }}</span>
                    </div>
                    <div class="cal-cell-tasks">
                        <div v-for="t in cellTasks(c.date).slice(0, 3)" :key="t.id" class="cal-task"
                            :class="{ done: t.completed, selected: c.date === selectedDate && t.id === selectedTaskId }">
                            <span class="cal-task-dot">{{ t.completed ? '✓' : '○' }}</span>
                            <span class="cal-task-title">{{ t.title }}</span>
                        </div>
                        <div v-if="cellTasks(c.date).length > 3" class="cal-overflow">+{{ cellTasks(c.date).length - 3 }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- month：仅当月天数网格（1 号对齐星期列，上/下月不占格） -->
        <div v-else>
            <div class="cal-weekdays">
                <span v-for="w in WEEKDAYS" :key="w" class="cal-weekday-label">{{ w }}</span>
            </div>
            <div class="cal-grid cal-month">
                <div v-for="(c, i) in monthCells" :key="c.date" class="cal-cell"
                    :style="i === 0 ? { gridColumnStart: firstCellColumn } : undefined"
                    :class="{ 'is-today': c.date === todayStr, 'is-focused': c.date === selectedDate }">
                    <div class="cal-cell-head">
                        <span class="cal-cell-date">{{ c.date.slice(8) }}</span>
                    </div>
                    <div class="cal-cell-tasks">
                        <div v-for="t in cellTasks(c.date).slice(0, 3)" :key="t.id" class="cal-task"
                            :class="{ done: t.completed, selected: c.date === selectedDate && t.id === selectedTaskId }">
                            <span class="cal-task-dot">{{ t.completed ? '✓' : '○' }}</span>
                            <span class="cal-task-title">{{ t.title }}</span>
                        </div>
                        <div v-if="cellTasks(c.date).length > 3" class="cal-overflow">+{{ cellTasks(c.date).length - 3 }}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, watch, nextTick } from 'vue';
import type { Task } from '../domain/task';
import { collectTasksInRange, getCalendarRange, weekdayName, calendarGridCells } from '../utils/calendar';
import { formatDate, parseDate } from '../utils/date-formatter';

const props = defineProps<{
    tasks: Task[];
    granularity: 'day' | 'week' | 'month';
    anchor: string;
    selectedDate?: string;
    selectedTaskId?: number;
    /** 网格内 Enter 打开的当日详情子视图（Esc 返回网格） */
    dayDetail?: boolean;
}>();

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const todayStr = formatDate(new Date());

const rangeLabel = computed(() => getCalendarRange(props.granularity, props.anchor).label);

/** date → 当日任务（含 repeat 展开）；week/month 均按整月网格收集，day 按天 */
const tasksByDate = computed(() => {
    const map = new Map<string, Task[]>();
    const rangeGran = props.granularity === 'day' ? 'day' : 'month';
    const days = collectTasksInRange(props.tasks, rangeGran, props.anchor);
    for (const d of days) map.set(d.date, d.tasks);
    return map;
});

const cellTasks = (date: string): Task[] => tasksByDate.value.get(date) ?? [];

/** 详情视图判定：day 粒度本身即详情；week/month 由网格内 Enter（dayDetail）打开 */
const showDetail = computed(() => props.granularity === 'day' || !!props.dayDetail);
const detailDate = computed(() =>
    props.granularity === 'day' ? props.anchor : (props.selectedDate ?? props.anchor)
);

/** week：锚点所在周（周日~周六）的 7 个日期（用于判定切换范围） */
const weekDates = computed(() => calendarGridCells('week', props.anchor));

/** month/week 网格：仅当月天数（上/下月不占格）；1 号对齐其星期列（gridColumnStart） */
const monthCells = computed(() => calendarGridCells('month', props.anchor).map((date) => ({ date })));

/** 当月 1 号的星期列（1=Sun .. 7=Sat） */
const firstCellColumn = computed(() => {
    const a = parseDate(props.anchor);
    return a ? a.getDay() + 1 : 1;
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

/* 周几表头行（week/month 网格上方） */
.cal-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    padding: 0 2px;
}

.cal-weekday-label {
    text-align: center;
    font-size: 10px;
    color: var(--text-3);
    letter-spacing: 0.05em;
    padding: 2px 0;
}

/* 网格：week 单行 / month 6 行 */
.cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
}

.cal-month .cal-cell {
    min-height: 74px;
}

/* 单日：整宽单元 */
.cal-single .cal-cell {
    min-height: 120px;
}

.cal-cell {
    border: 1px solid var(--border-soft);
    border-radius: 4px;
    padding: 4px 6px;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
}

/* 今天：**不用绿色高亮边框**（与选中框撞车）——只把日期号染磷光绿加粗 + • 圆点标记 */
.cal-cell.is-today .cal-cell-date {
    color: var(--accent);
    font-weight: 700;
}

.cal-cell.is-today .cal-cell-date::after {
    content: '•';
    margin-left: 2px;
    font-size: 9px;
    color: var(--accent);
}

/* 日焦点（j/k 移动）：磷光绿实线描边 + 淡底 */
.cal-cell.is-focused {
    border-color: var(--accent);
    background: rgba(89, 217, 138, 0.06);
}

/* 邻月日期：更淡更不明显 */
.cal-cell.is-dim {
    opacity: 0.35;
}

/* week 视图：切换范围（当前周）之外的日期置灰 */
.cal-cell.is-out {
    opacity: 0.45;
}

.cal-cell-head {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
}

.cal-cell-weekday {
    color: var(--text-2);
}

.cal-cell-date {
    color: var(--text-2);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.cal-today-flag {
    color: var(--accent);
    font-size: 9px;
    letter-spacing: 0.06em;
    border: 1px solid rgba(89, 217, 138, 0.3);
    padding: 0 4px;
    border-radius: 3px;
}

.cal-cell-tasks {
    display: flex;
    flex-direction: column;
    gap: 1px;
}

.cal-task {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 1px 3px;
    font-size: 11px;
    line-height: 1.5;
    border-radius: 2px;
}

.cal-task.selected {
    background: var(--active-grad);
    color: var(--text-bright);
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
    font-size: 10px;
    width: 10px;
    flex-shrink: 0;
}

.cal-task-title {
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}

.cal-overflow {
    font-size: 9px;
    color: var(--text-3);
    padding: 0 3px;
}

.cal-cell-empty {
    font-size: 11px;
    color: var(--text-faint);
    padding: 2px 3px;
}
</style>
