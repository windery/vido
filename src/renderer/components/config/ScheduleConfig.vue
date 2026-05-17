<template>
    <div class="schedule-config">
        <div class="current-value">
            {{ getScheduleDisplayText() }}
        </div>
        <div v-if="isEditing" class="edit-area">
            <!-- Schedule Tabs -->
            <div class="schedule-tabs">
                <div
                    v-for="(tab, index) in scheduleTabs"
                    :key="tab.key"
                    :class="['schedule-tab', {
                        'active': scheduleTabIndex === index,
                        'focused': scheduleTabIndex === index
                    }]"
                    @click="selectScheduleTab(index)"
                >
                    <span class="tab-icon">{{ tab.icon }}</span>
                    <span class="tab-label">{{ tab.label }}</span>
                </div>
            </div>
            
            <!-- Tab Content -->
            <div class="schedule-tab-content">
                <QuickOptionsTab
                    v-if="scheduleTabIndex === 0"
                    :quick-option-index="quickOptionIndex"
                    @select-option="selectQuickOption"
                />
                
                <DateInputTab
                    v-else-if="scheduleTabIndex === 1"
                    :is-active="dateInputActive"
                    :edit-values="editValues"
                    :current-value="getScheduleDisplayText()"
                    @activate="activateDateInput"
                    @save="saveDateInput"
                    @deactivate="dateInputActive = false"
                />
                
                <WeeklyOptionsTab
                    v-else-if="scheduleTabIndex === 2"
                    :weekly-option-index="weeklyOptionIndex"
                    @select-option="selectWeeklyOption"
                />
                
                <RangeInputTab
                    v-else-if="scheduleTabIndex === 3"
                    :is-active="rangeInputActive"
                    :range-start="rangeStart"
                    :range-end="rangeEnd"
                    @activate="activateRangeInput"
                    @save="saveRangeInput"
                    @deactivate="rangeInputActive = false"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Task } from '../../domain/task';
import { getScheduleDisplayText as getScheduleText, parseScheduleFromString } from '../../utils/schedule-helper';
import { logger } from '../../utils/logger';
import QuickOptionsTab from './schedule/QuickOptionsTab.vue';
import DateInputTab from './schedule/DateInputTab.vue';
import WeeklyOptionsTab from './schedule/WeeklyOptionsTab.vue';
import RangeInputTab from './schedule/RangeInputTab.vue';

interface Props {
    task: Task | null;
    isEditing: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    'update-task': [taskId: number, field: string, value: any];
    'deactivate': [];
}>();

// Schedule tabs data
const scheduleTabs = [
    { key: 'quick', label: '快速选择', icon: '⚡' },
    { key: 'date', label: '具体时间', icon: '📅' },
    { key: 'weekly', label: '星期', icon: '📆' },
    { key: 'range', label: '时间范围', icon: '📊' }
];

// Schedule tab state
const scheduleTabIndex = ref(0);
const quickOptionIndex = ref(0);
const weeklyOptionIndex = ref(0);
const dateInputActive = ref(false);
const rangeInputActive = ref(false);

// Edit values
const editValues = ref({
    schedule: ''
});

// Range inputs
const rangeStart = ref('');
const rangeEnd = ref('');

// Methods
const selectScheduleTab = (index: number) => {
    scheduleTabIndex.value = index;
    // Reset selection indices when switching tabs
    quickOptionIndex.value = 0;
    weeklyOptionIndex.value = 0;
    // Reset input active states
    dateInputActive.value = false;
    rangeInputActive.value = false;
};

const selectQuickOption = (value: string) => {
    saveScheduleValue(value);
    emit('deactivate');
};

const selectWeeklyOption = (value: string) => {
    saveScheduleValue(value);
    emit('deactivate');
};

const activateDateInput = () => {
    logger.debug('ScheduleConfig', 'Activating date input');
    dateInputActive.value = true;
};

const saveDateInput = (dateValue: string) => {
    logger.debug('ScheduleConfig', 'Saving date input and staying in config');
    saveScheduleValue(dateValue);
    dateInputActive.value = false;
    editValues.value.schedule = '';
};

const activateRangeInput = () => {
    logger.debug('ScheduleConfig', 'Activating range input');
    rangeInputActive.value = true;
};

const saveRangeInput = (startDate: string, endDate: string) => {
    logger.debug('ScheduleConfig', 'Saving range input and staying in config');
    saveScheduleValue(`${startDate} - ${endDate}`);
    rangeInputActive.value = false;
    rangeStart.value = '';
    rangeEnd.value = '';
};

const saveScheduleValue = (scheduleText: string) => {
    if (!props.task) return;

    const trimmedText = scheduleText.trim();
    if (trimmedText === '') return;

    if (trimmedText === 'clear') {
        emit('update-task', props.task.id, 'schedule', undefined);
    } else {
        const schedule = parseScheduleFromString(trimmedText);
        if (schedule) {
            emit('update-task', props.task.id, 'schedule', schedule);
        }
    }
};

const getScheduleDisplayText = () => {
    if (!props.task?.schedule) return 'No schedule set';
    return getScheduleText(props.task.schedule);
};

// Navigation methods
const navigateTabLeft = () => {
    scheduleTabIndex.value = Math.max(0, scheduleTabIndex.value - 1);
    selectScheduleTab(scheduleTabIndex.value);
};

const navigateTabRight = () => {
    scheduleTabIndex.value = Math.min(scheduleTabs.length - 1, scheduleTabIndex.value + 1);
    selectScheduleTab(scheduleTabIndex.value);
};

const navigateQuickOptionUp = () => {
    quickOptionIndex.value = Math.max(0, quickOptionIndex.value - 1);
};

const navigateQuickOptionDown = () => {
    quickOptionIndex.value = Math.min(3, quickOptionIndex.value + 1);
};

const navigateWeeklyOptionUp = () => {
    weeklyOptionIndex.value = Math.max(0, weeklyOptionIndex.value - 1);
};

const navigateWeeklyOptionDown = () => {
    weeklyOptionIndex.value = Math.min(6, weeklyOptionIndex.value + 1);
};

const selectCurrentQuickOption = () => {
    const quickOptions = ['today', 'tomorrow', 'next_week', 'clear'];
    const option = quickOptions[quickOptionIndex.value];
    selectQuickOption(option);
};

const selectCurrentWeeklyOption = () => {
    const weeklyOptions = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const option = weeklyOptions[weeklyOptionIndex.value];
    selectWeeklyOption(option);
};

// Handle keyboard events
const handleKeydown = (event: KeyboardEvent) => {
    logger.debug('ScheduleConfig', `handleKeydown: ${event.key}`);
    
    switch (event.key) {
        case 'h':
            event.preventDefault();
            event.stopPropagation();
            navigateTabLeft();
            return;
        case 'l':
            event.preventDefault();
            event.stopPropagation();
            navigateTabRight();
            return;
        case 'j':
            event.preventDefault();
            event.stopPropagation();
            if (scheduleTabIndex.value === 0) {
                navigateQuickOptionDown();
            } else if (scheduleTabIndex.value === 2) {
                navigateWeeklyOptionDown();
            }
            return;
        case 'k':
            event.preventDefault();
            event.stopPropagation();
            if (scheduleTabIndex.value === 0) {
                navigateQuickOptionUp();
            } else if (scheduleTabIndex.value === 2) {
                navigateWeeklyOptionUp();
            }
            return;
        case 'Enter':
            event.preventDefault();
            event.stopPropagation();
            if (scheduleTabIndex.value === 0) {
                selectCurrentQuickOption();
            } else if (scheduleTabIndex.value === 2) {
                selectCurrentWeeklyOption();
            } else if (scheduleTabIndex.value === 1) {
                if (!dateInputActive.value) {
                    activateDateInput();
                } else {
                    // This will be handled by DateInputTab
                }
            } else if (scheduleTabIndex.value === 3) {
                if (!rangeInputActive.value) {
                    activateRangeInput();
                } else {
                    // This will be handled by RangeInputTab
                }
            }
            return;
        default:
            // Check for number shortcuts in quick options tab
            if (scheduleTabIndex.value === 0) {
                const num = parseInt(event.key);
                if (num >= 1 && num <= 4) {
                    event.preventDefault();
                    event.stopPropagation();
                    quickOptionIndex.value = num - 1;
                    selectCurrentQuickOption();
                    return;
                }
            }
            break;
        case 'Escape':
            event.preventDefault();
            event.stopPropagation();
            if (dateInputActive.value || rangeInputActive.value) {
                dateInputActive.value = false;
                rangeInputActive.value = false;
            } else {
                emit('deactivate');
            }
            return;
    }
};

// Expose methods for parent component
defineExpose({
    handleKeydown,
    resetState: () => {
        dateInputActive.value = false;
        rangeInputActive.value = false;
        scheduleTabIndex.value = 0;
        quickOptionIndex.value = 0;
        weeklyOptionIndex.value = 0;
    }
});
</script>

<style scoped>
.schedule-config {
    width: 100%;
}

.current-value {
    padding: 12px;
    background: #2e2e32;
    border-radius: 6px;
    color: #e6e6e6;
    font-size: 14px;
    margin-bottom: 12px;
    min-height: 20px;
    display: flex;
    align-items: center;
}

.edit-area {
    width: 100%;
}

/* Schedule Tabs Styles */
.schedule-tabs {
    display: flex;
    gap: 2px;
    margin-bottom: 12px;
    border-radius: 6px;
    background: #2e2e32;
    padding: 4px;
}

.schedule-tab {
    flex: 1;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12px;
    transition: all 0.2s ease;
    color: #a5a5a5;
    background: transparent;
    border: 1px solid transparent;
}

.schedule-tab:hover {
    background: #3e3e42;
    color: #e6e6e6;
    transform: translateY(-1px);
}

.schedule-tab.active {
    background: #0969da;
    color: white;
    border-color: #0969da;
    transform: translateY(-1px);
}

.schedule-tab.focused {
    box-shadow: 0 0 0 2px #0969da40;
    transform: translateY(-2px);
}

.tab-icon {
    font-size: 14px;
}

.tab-label {
    font-weight: 500;
}

.schedule-tab-content {
    min-height: 160px;
    padding: 12px 0;
}
</style>
