<template>
    <div class="calendar-view">
        <!-- 头部：粒度徽章居左；年月范围**居中放大**（磷光绿加粗，一眼锁定当前展示范围） -->
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

        <!-- week：7 列日计划表（周日~周六），每天一列竖排任务；跨月周列头各标自己月份（8/30 → 9/1） -->
        <div v-else-if="granularity === 'week'">
            <div class="cal-grid cal-week">
                <div v-for="c in weekCells" :key="c.date" class="cal-cell"
                    :class="{ 'is-today': c.date === todayStr, 'is-focused': c.date === selectedDate }">
                    <div class="cal-cell-head">
                        <span class="cal-cell-weekday">{{ weekdayName(c.date) }}</span>
                        <span class="cal-cell-date">{{ c.label }}</span>
                    </div>
                    <div class="cal-cell-tasks">
                        <div v-for="t in cellTasks(c.date).slice(0, 6)" :key="t.id" class="cal-task"
                            :class="{ done: t.completed, selected: c.date === selectedDate && t.id === selectedTaskId }">
                            <span v-if="t.priority" class="cal-pri" :class="priClass(t.priority)">{{ priMark(t.priority) }}</span>
                            <span v-if="cellTime(t)" class="cal-time">◷{{ cellTime(t) }}</span>
                            <span class="cal-task-dot">{{ t.completed ? '✓' : '○' }}</span>
                            <span class="cal-task-title">{{ t.title }}</span>
                        </div>
                        <div v-if="cellTasks(c.date).length > 6" class="cal-overflow">+{{ cellTasks(c.date).length - 6 }}</div>
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
                            <span v-if="t.priority" class="cal-pri" :class="priClass(t.priority)">{{ priMark(t.priority) }}</span>
                            <span v-if="cellTime(t)" class="cal-time">◷{{ cellTime(t) }}</span>
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
import { TaskPriority } from '../domain/task';
import { collectTasksInRange, getCalendarRange, weekdayName, calendarGridCells } from '../utils/calendar';
import { getScheduleTime } from '../utils/schedule-helper';
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

/** date → 当日任务（含 repeat 展开）；范围与各粒度视图一致：day=当天、week=活跃周、month=当月 */
const tasksByDate = computed(() => {
    const map = new Map<string, Task[]>();
    const rangeGran = props.granularity === 'day' ? 'day' : props.granularity === 'week' ? 'week' : 'month';
    const days = collectTasksInRange(props.tasks, rangeGran, props.anchor);
    for (const d of days) map.set(d.date, d.tasks);
    return map;
});

const cellTasks = (date: string): Task[] => tasksByDate.value.get(date) ?? [];

/** 任务格优先级标记：ANSI 红/黄/绿 !!! / !! / !（与任务列表一致） */
const PRI_MARK: Record<TaskPriority, string> = {
    [TaskPriority.HIGH]: '!!!',
    [TaskPriority.MEDIUM]: '!!',
    [TaskPriority.LOW]: '!',
};
const PRI_CLASS: Record<TaskPriority, string> = {
    [TaskPriority.HIGH]: 'pri-p1',
    [TaskPriority.MEDIUM]: 'pri-p2',
    [TaskPriority.LOW]: 'pri-p3',
};
const priMark = (p: TaskPriority): string => PRI_MARK[p];
const priClass = (p: TaskPriority): string => PRI_CLASS[p];

/** 任务格时间标记：◷ + HH:MM（直接从日程数据提取，过期日程显示文本不带时间） */
const cellTime = (t: Task): string => (t.schedule ? getScheduleTime(t.schedule) : '');

/** 详情视图判定：day 粒度本身即详情；week/month 由网格内 Enter（dayDetail）打开 */
const showDetail = computed(() => props.granularity === 'day' || !!props.dayDetail);
const detailDate = computed(() =>
    props.granularity === 'day' ? props.anchor : (props.selectedDate ?? props.anchor)
);

/** month 网格：仅当月天数（上/下月不占格）；1 号对齐其星期列（gridColumnStart） */
const monthCells = computed(() => calendarGridCells('month', props.anchor).map((date) => ({ date })));

/** 当月 1 号的星期列（1=Sun .. 7=Sat） */
const firstCellColumn = computed(() => {
    const a = parseDate(props.anchor);
    return a ? a.getDay() + 1 : 1;
});

/**
 * week 视图：活跃周 7 天（周日~周六）的 7 列。
 * 列头日期标签：当周跨月时，月份变化的那天起带月前缀（8/30、31、9/1 …），否则只显示日号。
 */
const weekCells = computed(() => {
    let prevMonth = '';
    return calendarGridCells('week', props.anchor).map((date) => {
        const month = date.slice(5, 7);
        const day = String(parseInt(date.slice(8), 10)); // 去前导零：'05' → '5'
        // 跨月那天起带月前缀（8/30 → 9/1 风格），同月只显示日号
        const label = month === prevMonth ? day : `${parseInt(month, 10)}/${day}`;
        prevMonth = month;
        return { date, label };
    });
});

// 选中/翻页/切粒度变化时：目标任务行与高亮日格滚入视口（vim-instant：同一帧、最小滚动）
watch(
    () => `${props.granularity}:${props.anchor}:${props.selectedDate}:${props.selectedTaskId}`,
    () => {
        nextTick(() => {
            const taskEl = document.querySelector('.cal-task.selected');
            taskEl?.scrollIntoView?.({ behavior: 'auto', block: 'nearest' });
            const cellEl = document.querySelector('.cal-cell.is-focused');
            cellEl?.scrollIntoView?.({ behavior: 'auto', block: 'nearest' });
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
    position: relative;
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

/* 年月范围：头部正中、放大加粗磷光绿——当前展示范围一眼锁定 */
.cal-range {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    color: var(--accent);
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.04em;
    font-variant-numeric: tabular-nums;
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

/* week：7 列日计划表。min-height 只兜底空周不塌陷；内容多时网格行随最高列自然长高（同行等高） */
.cal-week .cal-cell {
    min-height: 96px;
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

/* week 计划表：今天的列加极淡绿底（区别于选中绿框），快速定位今天 */
.cal-week .cal-cell.is-today {
    background: rgba(89, 217, 138, 0.05);
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

/* week 视图：当前周更突出——淡磷光绿底 + 亮边框；范围外日期明显更淡，区分一眼可辨 */
.cal-cell.is-week {
    background: rgba(89, 217, 138, 0.08);
    border-color: rgba(89, 217, 138, 0.4);
}

.cal-cell.is-out {
    opacity: 0.3;
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

/* 任务格内联标记：优先级 ANSI 色 + 日程时间（与任务列表语义一致） */
.cal-pri {
    font-size: 9px;
    flex-shrink: 0;
    letter-spacing: -0.5px;
}

.cal-pri.pri-p1 { color: var(--p1); }
.cal-pri.pri-p2 { color: var(--p2); }
.cal-pri.pri-p3 { color: var(--p3); }

.cal-time {
    color: var(--text-3);
    font-size: 9px;
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
