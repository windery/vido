<template>
    <div v-if="visible" class="config-overlay" @click="handleOverlayClick">
        <div class="config-panel" @click.stop>
            <div class="config-header">
                <h2>Task Configuration</h2>
                <div class="task-info">{{ task?.title || 'No task selected' }}</div>
            </div>

            <div class="config-content">
                <!-- Schedule Configuration -->
                <div class="config-section" :class="{ active: currentSection === 0 }" @click="selectSection(0)">
                    <div class="section-header">
                        <span class="section-icon">📅</span>
                        <span class="section-title">Schedule</span>
                        <span class="section-shortcut">Enter to edit</span>
                    </div>
                    <div class="section-content">
                        <div class="current-value">
                            {{ getScheduleDisplayText() }}
                        </div>
                        <div v-if="editingSection === 0" class="edit-area">
                            <input ref="scheduleInput" v-model="editValues.schedule" @keydown="handleInputKeydown"
                                placeholder="今天, 明天, 周一, 2025-08-01, clear" class="config-input" />
                            <div class="input-hint">Format: 今天/明天/周一/YYYY-MM-DD [HH:MM:SS]</div>
                        </div>
                    </div>
                </div>

                <!-- Priority Configuration -->
                <div class="config-section" :class="{ active: currentSection === 1 }" @click="selectSection(1)">
                    <div class="section-header">
                        <span class="section-icon">⚡</span>
                        <span class="section-title">Priority</span>
                        <span class="section-shortcut">Enter to edit</span>
                    </div>
                    <div class="section-content">
                        <div class="current-value">
                            {{ getPriorityDisplayText() }}
                        </div>
                        <div v-if="editingSection === 1" class="edit-area">
                            <div class="priority-options">
                                <div 
                                    v-for="(option, index) in priorityOptions" 
                                    :key="option.value"
                                    :class="['priority-option', { 
                                        'selected': editValues.priority === option.value,
                                        'focused': priorityFocusIndex === index 
                                    }]"
                                    @click="selectPriority(option.value)"
                                >
                                    <span class="priority-icon">{{ option.icon }}</span>
                                    <span class="priority-label">{{ option.label }}</span>
                                    <span class="priority-key">{{ option.key }}</span>
                                </div>
                            </div>
                            <div class="input-hint">Use j/k to change, H/M/L shortcuts</div>
                        </div>
                    </div>
                </div>

                <!-- Tags Configuration -->
                <div class="config-section" :class="{ active: currentSection === 2 }" @click="selectSection(2)">
                    <div class="section-header">
                        <span class="section-icon">🏷️</span>
                        <span class="section-title">Tags</span>
                        <span class="section-shortcut">Enter to edit</span>
                    </div>
                    <div class="section-content">
                        <div class="current-value">
                            {{ getTagsDisplayText() }}
                        </div>
                        <div v-if="editingSection === 2" class="edit-area">
                            <input ref="tagsInput" v-model="editValues.tags" @keydown="handleInputKeydown"
                                placeholder="tag1, tag2, tag3" class="config-input" />
                            <div class="input-hint">Separate tags with commas</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="config-footer">
                <template v-if="editingSection === 1">
                    <span class="key-hint">j/k</span> change •
                    <span class="key-hint">H/M/L</span> shortcuts •
                    <span class="key-hint">Esc</span> done
                </template>
                <template v-else>
                    <span class="key-hint">j/k</span> navigate •
                    <span class="key-hint">Enter</span> edit •
                    <span class="key-hint">Esc</span> close
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { Task, TaskPriority } from '../../shared/domain/task';
import { getScheduleDisplayText as getScheduleText, parseScheduleFromString } from '../../shared/utils/schedule-helper';
import { logger } from '../utils/logger';

interface Props {
    visible: boolean;
    task: Task | null;
}

interface Emits {
    (e: 'close'): void;
    (e: 'update-task', taskId: number, property: string, value: any): void;
    (e: 'keydown', event: KeyboardEvent): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Configuration state
const currentSection = ref(0);
const editingSection = ref(-1);
const totalSections = 3;

// Priority options data
const priorityOptions = [
    { value: TaskPriority.HIGH, label: 'P1 - High', icon: '🔴', key: 'H' },
    { value: TaskPriority.MEDIUM, label: 'P2 - Medium', icon: '🟡', key: 'M' },
    { value: TaskPriority.LOW, label: 'P3 - Low', icon: '🟢', key: 'L' }
];

// Priority selection state
const priorityFocusIndex = ref(0);

// Edit values
const editValues = ref({
    schedule: '',
    priority: TaskPriority.MEDIUM,
    tags: ''
});

// Refs for inputs
const scheduleInput = ref<HTMLInputElement>();
const tagsInput = ref<HTMLInputElement>();

// Watch for task changes to update edit values
watch(() => props.task, (newTask) => {
    if (newTask) {
        editValues.value.priority = newTask.priority || TaskPriority.MEDIUM;
        editValues.value.tags = (newTask.tags || []).join(', ');
        editValues.value.schedule = '';
        
        // Update priority focus index to match current priority
        const currentPriorityIndex = priorityOptions.findIndex(option => option.value === editValues.value.priority);
        if (currentPriorityIndex !== -1) {
            priorityFocusIndex.value = currentPriorityIndex;
        }
    }
}, { immediate: true });

// Navigation methods
const selectSection = (index: number) => {
    currentSection.value = index;
    editingSection.value = -1;
};

const navigateUp = () => {
    if (editingSection.value !== -1) return;
    currentSection.value = Math.max(0, currentSection.value - 1);
    scrollToCurrentSection();
};

const navigateDown = () => {
    if (editingSection.value !== -1) return;
    currentSection.value = Math.min(totalSections - 1, currentSection.value + 1);
    scrollToCurrentSection();
};

const startEditing = async () => {
    if (editingSection.value !== -1) return;

    editingSection.value = currentSection.value;

    await nextTick();

    // Focus the appropriate input
    switch (currentSection.value) {
        case 0:
            scheduleInput.value?.focus();
            break;
        case 1:
            // For priority, reset focus index to current priority
            const currentPriorityIndex = priorityOptions.findIndex(option => option.value === editValues.value.priority);
            if (currentPriorityIndex !== -1) {
                priorityFocusIndex.value = currentPriorityIndex;
            }
            // 确保priority编辑区域在视野中
            scrollToCurrentSection();
            break;
        case 2:
            tagsInput.value?.focus();
            break;
    }
};

// 滚动到当前section
const scrollToCurrentSection = () => {
    nextTick(() => {
        const currentSectionElement = document.querySelector('.config-section.active');
        if (currentSectionElement) {
            currentSectionElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    });
};

// Priority selection methods
const selectPriority = (priority: TaskPriority) => {
    editValues.value.priority = priority;
    savePriorityAndExit();
};

const navigatePriorityUp = () => {
    priorityFocusIndex.value = Math.max(0, priorityFocusIndex.value - 1);
    editValues.value.priority = priorityOptions[priorityFocusIndex.value].value;
    // 直接保存，保持编辑状态
    savePriority();
};

const navigatePriorityDown = () => {
    priorityFocusIndex.value = Math.min(priorityOptions.length - 1, priorityFocusIndex.value + 1);
    editValues.value.priority = priorityOptions[priorityFocusIndex.value].value;
    // 直接保存，保持编辑状态
    savePriority();
};

const stopEditing = () => {
    logger.debug('TaskConfig', 'stopEditing called, setting editingSection to -1');
    editingSection.value = -1;
    logger.debug('TaskConfig', `editingSection after stopEditing: ${editingSection.value}`);
};

// Display methods
const getScheduleDisplayText = () => {
    if (!props.task?.schedule) return 'No schedule set';
    return getScheduleText(props.task.schedule);
};

const getPriorityDisplayText = () => {
    if (!props.task) return 'P2 - Medium';
    const priorityMap = {
        [TaskPriority.HIGH]: 'P1 - High',
        [TaskPriority.MEDIUM]: 'P2 - Medium',
        [TaskPriority.LOW]: 'P3 - Low'
    };
    return priorityMap[props.task.priority || TaskPriority.MEDIUM] || 'P2 - Medium';
};

const getTagsDisplayText = () => {
    if (!props.task?.tags?.length) return 'No tags';
    return props.task.tags.join(', ');
};

// Save methods
const saveSchedule = () => {
    if (!props.task) return;

    const scheduleText = editValues.value.schedule.trim();
    if (scheduleText === '') {
        stopEditing();
        return;
    }

    if (scheduleText === 'clear') {
        emit('update-task', props.task.id, 'schedule', undefined);
    } else {
        const schedule = parseScheduleFromString(scheduleText);
        if (schedule) {
            emit('update-task', props.task.id, 'schedule', schedule);
        }
    }

    editValues.value.schedule = '';
    stopEditing();
};

const savePriority = () => {
    if (!props.task) return;

    emit('update-task', props.task.id, 'priority', editValues.value.priority);
    // 不调用stopEditing()，保持编辑状态，用户可以继续调整
};

const savePriorityAndExit = () => {
    if (!props.task) return;

    emit('update-task', props.task.id, 'priority', editValues.value.priority);
    stopEditing();
};

const saveTags = () => {
    if (!props.task) return;

    const tagsText = editValues.value.tags.trim();
    const tags = tagsText ? tagsText.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    emit('update-task', props.task.id, 'tags', tags);
    stopEditing();
};

// Event handlers
const handleOverlayClick = () => {
    emit('close');
};

const handleInputKeydown = (event: KeyboardEvent) => {
    logger.debug('TaskConfig', `handleInputKeydown: ${event.key}, editingSection: ${editingSection.value}`);

    if (event.key === 'Escape') {
        event.preventDefault();
        logger.debug('TaskConfig', 'Input Escape: calling stopEditing');
        stopEditing();
    } else if (event.key === 'Enter') {
        event.preventDefault();
        logger.debug('TaskConfig', 'Input Enter: saving and stopping editing');
        // Save based on current section
        switch (currentSection.value) {
            case 0:
                saveSchedule();
                break;
            case 1:
                savePriority();
                break;
            case 2:
                saveTags();
                break;
        }
    }
    // 其他键让输入框正常处理
};

// Keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
    logger.debug('TaskConfig', `handleKeydown: ${event.key}, editingSection: ${editingSection.value}`);

    // 如果正在编辑
    if (editingSection.value !== -1) {
        logger.debug('TaskConfig', `In editing mode, handling: ${event.key}`);
        
        // Priority编辑模式下的特殊处理
        if (editingSection.value === 1) {
            switch (event.key) {
                case 'j':
                    event.preventDefault();
                    event.stopPropagation();
                    navigatePriorityDown();
                    return;
                case 'k':
                    event.preventDefault();
                    event.stopPropagation();
                    navigatePriorityUp();
                    return;
                case 'Escape':
                    event.preventDefault();
                    event.stopPropagation();
                    stopEditing();
                    return;
                default:
                    // 检查快捷键
                    const shortcutOption = priorityOptions.find(option => 
                        option.key.toLowerCase() === event.key.toLowerCase()
                    );
                    if (shortcutOption) {
                        event.preventDefault();
                        event.stopPropagation();
                        editValues.value.priority = shortcutOption.value;
                        savePriorityAndExit();
                        return;
                    }
                    break;
            }
            return;
        }
        
        // 其他输入框的处理
        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                logger.debug('TaskConfig', 'Stopping editing');
                stopEditing();
                break;
            // 其他键让输入框自己处理
        }
        return;
    }

    // 导航模式下的键盘处理
    logger.debug('TaskConfig', `In navigation mode, handling: ${event.key}`);
    switch (event.key) {
        case 'j':
            event.preventDefault();
            navigateDown();
            break;
        case 'k':
            event.preventDefault();
            navigateUp();
            break;
        case 'Enter':
            event.preventDefault();
            logger.debug('TaskConfig', 'Starting editing');
            startEditing();
            break;
        case 'Escape':
            event.preventDefault();
            logger.debug('TaskConfig', 'Closing config');
            emit('close');
            break;
    }
};

// Expose keyboard handler for parent component
defineExpose({
    handleKeydown
});
</script>

<style scoped>
.config-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
}

.config-panel {
    background: #2d2d2d;
    border: 1px solid #3e3e42;
    border-radius: 8px;
    width: min(600px, 90vw);
    max-height: min(90vh, 800px);
    min-height: 300px;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    margin: 16px;
}

.config-header {
    padding: 16px 24px;
    background: #383838;
    border-bottom: 1px solid #3e3e42;
    border-radius: 8px 8px 0 0;
}

.config-header h2 {
    color: #ffffff;
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 4px 0;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.task-info {
    color: #a5a5a5;
    font-size: 14px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.config-content {
    flex: 1;
    padding: 16px 0;
    overflow-y: auto;
    scroll-behavior: smooth;
}

/* 确保内容区域有足够的滚动空间 */
.config-content::-webkit-scrollbar {
    width: 8px;
}

.config-content::-webkit-scrollbar-track {
    background: #2d2d2d;
}

.config-content::-webkit-scrollbar-thumb {
    background: #424242;
    border-radius: 4px;
}

.config-content::-webkit-scrollbar-thumb:hover {
    background: #4f4f4f;
}

.config-section {
    margin: 0 24px 16px 24px;
    padding: 16px;
    border: 1px solid #3e3e42;
    border-radius: 6px;
    background: #1e1e1e;
    cursor: pointer;
    transition: all 0.2s ease;
}

.config-section:hover {
    border-color: #4fc1ff;
}

.config-section.active {
    border-color: #4fc1ff;
    background: #1a1a1a;
    box-shadow: 0 0 0 1px #4fc1ff;
}

.section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.section-icon {
    font-size: 18px;
}

.section-title {
    color: #ffffff;
    font-size: 16px;
    font-weight: 600;
    flex: 1;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.section-shortcut {
    color: #6e7681;
    font-size: 12px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.section-content {
    margin-left: 30px;
}

.current-value {
    color: #d4d4d4;
    font-size: 14px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    margin-bottom: 8px;
}

.edit-area {
    margin-top: 12px;
}

.config-input,
.config-select {
    width: 100%;
    background: #1a1a1a;
    border: 1px solid #4fc1ff;
    color: #d4d4d4;
    padding: 8px 12px;
    border-radius: 4px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-size: 14px;
}

.config-input:focus,
.config-select:focus {
    outline: none;
    border-color: #79c0ff;
    box-shadow: 0 0 0 2px rgba(121, 192, 255, 0.2);
}

.input-hint {
    color: #6e7681;
    font-size: 11px;
    margin-top: 4px;
    font-style: italic;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.config-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 12px 24px;
    border-top: 1px solid #3e3e42;
    background: #383838;
    border-radius: 0 0 8px 8px;
    color: #a5a5a5;
    font-size: 12px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.key-hint {
    background: #1e1e1e;
    color: #f9e79f;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #3e3e42;
    font-weight: 600;
    margin: 0 4px;
}

.priority-options {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 120px; /* 减少最小高度 */
}

.priority-option {
    display: flex;
    align-items: center;
    padding: 8px 12px; /* 减少内边距 */
    background: #1a1a1a;
    border: 1px solid #3e3e42;
    border-radius: 4px; /* 减少圆角 */
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    min-height: 36px; /* 减少最小高度 */
}

.priority-option:hover {
    border-color: #4fc1ff;
    background: #252525;
}

.priority-option.focused {
    border-color: #4fc1ff;
    background: #252525;
    box-shadow: 0 0 0 2px rgba(79, 193, 255, 0.2);
}

.priority-option.selected {
    border-color: #79c0ff;
    background: #1f2428;
    box-shadow: 0 0 0 2px rgba(121, 192, 255, 0.3);
}

.priority-option.selected.focused {
    border-color: #79c0ff;
    background: #1f2428;
    box-shadow: 0 0 0 2px rgba(121, 192, 255, 0.4);
}

.priority-icon {
    font-size: 14px; /* 减小图标 */
    margin-right: 8px; /* 减少间距 */
    flex-shrink: 0;
}

.priority-label {
    color: #d4d4d4;
    font-size: 13px; /* 减小字体 */
    flex: 1;
}

.priority-key {
    color: #6e7681;
    font-size: 11px; /* 减小字体 */
    background: #2d2d2d;
    padding: 1px 4px; /* 减少内边距 */
    border-radius: 2px; /* 减少圆角 */
    border: 1px solid #3e3e42;
    font-weight: 600;
}

.priority-option.focused .priority-key {
    color: #f9e79f;
    background: #1e1e1e;
    border-color: #4fc1ff;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* 小屏幕适配 */
@media (max-height: 600px) {
    .config-panel {
        max-height: 95vh;
        margin: 8px;
    }
    
    .config-header {
        padding: 12px 16px;
    }
    
    .config-content {
        padding: 8px 0;
    }
    
    .config-section {
        margin: 0 16px 12px 16px;
        padding: 12px;
    }
    
    .priority-option {
        padding: 6px 10px;
        min-height: 32px;
    }
    
    .priority-options {
        min-height: 100px;
        gap: 3px;
    }
    
    .config-footer {
        padding: 8px 16px;
        font-size: 11px;
    }
}

@media (max-width: 480px) {
    .config-panel {
        width: 95vw;
        margin: 4px;
    }
    
    .config-section {
        margin: 0 8px 8px 8px;
    }
    
    .priority-label {
        font-size: 13px;
    }
    
    .priority-key {
        font-size: 11px;
        padding: 1px 4px;
    }
}
</style>