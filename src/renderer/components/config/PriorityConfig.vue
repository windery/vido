<template>
    <div class="priority-config">
        <div class="current-value">
            {{ getPriorityDisplayText() }}
        </div>
        <div v-if="isEditing" class="edit-area">
            <div class="priority-options">
                <div
                    v-for="(option, index) in priorityOptions"
                    :key="option.value"
                    :class="['priority-option', {
                        'selected': task?.priority === option.value,
                        'focused': priorityFocusIndex === index
                    }]"
                    @click="selectPriority(option.value)"
                >
                    <span class="priority-icon">{{ option.icon }}</span>
                    <span class="priority-label">{{ option.label }}</span>
                </div>
            </div>
            <div class="input-hint">Use j/k to change, 1/2/3 shortcuts</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Task, TaskPriority } from '../../domain/task';
import { logger } from '../../utils/logger';

interface Props {
    task: Task | null;
    isEditing: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    'update-task': [taskId: number, field: string, value: any];
    'deactivate': [];
}>();

// Priority options data
const priorityOptions = [
    { value: TaskPriority.HIGH, label: 'P1 - High', icon: '🔴', key: '1' },
    { value: TaskPriority.MEDIUM, label: 'P2 - Medium', icon: '🟡', key: '2' },
    { value: TaskPriority.LOW, label: 'P3 - Low', icon: '🟢', key: '3' }
];

// Priority selection state
const priorityFocusIndex = ref(0);

// Methods
const selectPriority = (priority: TaskPriority) => {
    if (!props.task) return;
    
    logger.debug('PriorityConfig', `Selecting priority: ${priority}`);
    emit('update-task', props.task.id, 'priority', priority);
    emit('deactivate');
};

const navigatePriorityUp = () => {
    priorityFocusIndex.value = Math.max(0, priorityFocusIndex.value - 1);
    const selectedPriority = priorityOptions[priorityFocusIndex.value].value;
    savePriority(selectedPriority);
};

const navigatePriorityDown = () => {
    priorityFocusIndex.value = Math.min(priorityOptions.length - 1, priorityFocusIndex.value + 1);
    const selectedPriority = priorityOptions[priorityFocusIndex.value].value;
    savePriority(selectedPriority);
};

const savePriority = (priority: TaskPriority) => {
    if (!props.task) return;
    
    logger.debug('PriorityConfig', `Saving priority: ${priority}`);
    emit('update-task', props.task.id, 'priority', priority);
    // Don't deactivate, stay in priority editing mode
};

const getPriorityDisplayText = () => {
    if (!props.task) return 'P2 - Medium';
    const priorityMap = {
        [TaskPriority.HIGH]: 'P1 - High',
        [TaskPriority.MEDIUM]: 'P2 - Medium',
        [TaskPriority.LOW]: 'P3 - Low'
    };
    return priorityMap[props.task.priority || TaskPriority.MEDIUM];
};

// Handle keyboard events
const handleKeydown = (event: KeyboardEvent) => {
    logger.debug('PriorityConfig', `handleKeydown: ${event.key}`);
    
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
            emit('deactivate');
            return;
        default: {
            // Check for number shortcuts
            const shortcutOption = priorityOptions.find(option =>
                option.key === event.key
            );
            if (shortcutOption) {
                event.preventDefault();
                event.stopPropagation();
                selectPriority(shortcutOption.value);
                return;
            }
            break;
        }
    }
};

// Initialize priority focus index based on current priority
const initializeFocusIndex = () => {
    if (props.task?.priority) {
        const currentIndex = priorityOptions.findIndex(option => option.value === props.task?.priority);
        if (currentIndex !== -1) {
            priorityFocusIndex.value = currentIndex;
        }
    }
};

// Watch for task changes
watch(() => props.task, () => {
    initializeFocusIndex();
}, { immediate: true });

// Expose methods for parent component
defineExpose({
    handleKeydown,
    resetState: () => {
        priorityFocusIndex.value = 0;
    }
});
</script>

<style scoped>
.priority-config {
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

.priority-options {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 8px;
}

.priority-option {
    padding: 8px 12px;
    border: 2px solid #3e3e42;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    transition: all 0.2s ease;
    background: #2e2e32;
    color: #e6e6e6;
    min-height: 40px;
}

.priority-option:hover {
    border-color: #0969da;
    background: #0969da10;
    transform: translateX(2px);
}

.priority-option.selected {
    border-color: #0969da;
    background: #0969da20;
    transform: translateX(2px);
}

.priority-option.focused {
    border-color: #0969da;
    background: #0969da20;
    box-shadow: 0 0 0 3px #0969da30, inset 0 0 0 1px #0969da;
    transform: translateX(4px);
}

.priority-icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
}

.priority-label {
    font-weight: 500;
    flex: 1;
}

.input-hint {
    color: #6e7681;
    font-size: 11px;
    margin-top: 4px;
    font-style: italic;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}
</style>
