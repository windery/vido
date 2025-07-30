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
                        <ScheduleConfig
                            :task="task"
                            :is-editing="editingSection === 0"
                            @update-task="updateTask"
                            @deactivate="deactivateEditing"
                            ref="scheduleConfigRef"
                        />
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
                        <PriorityConfig
                            :task="task"
                            :is-editing="editingSection === 1"
                            @update-task="updateTask"
                            @deactivate="deactivateEditing"
                            ref="priorityConfigRef"
                        />
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
                        <TagsConfig
                            :task="task"
                            :is-editing="editingSection === 2"
                            @update-task="updateTask"
                            @deactivate="deactivateEditing"
                            ref="tagsConfigRef"
                        />
                    </div>
                </div>
            </div>

            <div class="config-footer">
                <template v-if="editingSection === 0">
                    <span class="key-hint">h/l</span> switch tab •
                    <span class="key-hint">j/k</span> navigate •
                    <span class="key-hint">Enter</span> select •
                    <span class="key-hint">Esc</span> done
                </template>
                <template v-else-if="editingSection === 1">
                    <span class="key-hint">j/k</span> change •
                    <span class="key-hint">1/2/3</span> shortcuts •
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
import { ref, nextTick } from 'vue';
import { Task } from '@renderer/domain/task';
import { logger } from '@utils/logger';
import ScheduleConfig from '@components/config/ScheduleConfig.vue';
import PriorityConfig from '@components/config/PriorityConfig.vue';
import TagsConfig from '@components/config/TagsConfig.vue';

interface Props {
    visible: boolean;
    task: Task | null;
}

interface Emits {
    (e: 'close'): void;
    (e: 'update-task', taskId: number, property: string, value: any): void;
    (e: 'keydown', event: KeyboardEvent): void;
}

const _props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Component refs
const scheduleConfigRef = ref();
const priorityConfigRef = ref();
const tagsConfigRef = ref();

// Configuration state
const currentSection = ref(0);
const editingSection = ref(-1);
const totalSections = 3;

// Methods for component integration
const updateTask = (taskId: number, field: string, value: any) => {
    emit('update-task', taskId, field, value);
};

const deactivateEditing = () => {
    editingSection.value = -1;
};

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
    scrollToCurrentSection();
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

const handleOverlayClick = () => {
    emit('close');
};

// Keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
    logger.debug('TaskConfig', `handleKeydown: ${event.key}, editingSection: ${editingSection.value}`);

    // 如果正在编辑
    if (editingSection.value !== -1) {
        logger.debug('TaskConfig', `In editing mode, handling: ${event.key}`);
        
        // Delegate to appropriate component
        if (editingSection.value === 0 && scheduleConfigRef.value) {
            scheduleConfigRef.value.handleKeydown(event);
            return;
        } else if (editingSection.value === 1 && priorityConfigRef.value) {
            priorityConfigRef.value.handleKeydown(event);
            return;
        } else if (editingSection.value === 2 && tagsConfigRef.value) {
            // Tags config will handle its own keyboard events
            tagsConfigRef.value.handleKeydown(event);
            return;
        }
        
        // Component delegation should have handled it, fallback for any missed cases
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
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
}

.config-panel {
    background: #1e1e20;
    border-radius: 12px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    max-width: 700px;
    width: 90%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    border: 1px solid #3e3e42;
}

.config-header {
    padding: 24px 24px 0 24px;
    border-bottom: 1px solid #3e3e42;
    margin-bottom: 20px;
}

.config-header h2 {
    margin: 0 0 8px 0;
    color: #e6e6e6;
    font-size: 20px;
    font-weight: 600;
}

.task-info {
    color: #a5a5a5;
    font-size: 14px;
    margin-bottom: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.config-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 24px;
    min-height: 0;
}

.config-section {
    margin-bottom: 16px;
    border: 2px solid transparent;
    border-radius: 8px;
    transition: all 0.2s ease;
    cursor: pointer;
}

.config-section:hover {
    border-color: #3e3e42;
    background: #28282a;
}

.config-section.active {
    border-color: #0969da;
    background: #0969da10;
}

.section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-radius: 6px;
}

.section-icon {
    font-size: 18px;
    width: 24px;
    text-align: center;
}

.section-title {
    flex: 1;
    font-weight: 500;
    color: #e6e6e6;
    font-size: 16px;
}

.section-shortcut {
    color: #6e7681;
    font-size: 12px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    background: #3e3e42;
    padding: 4px 8px;
    border-radius: 4px;
}

.section-content {
    padding: 0 16px 16px 16px;
}

.config-footer {
    padding: 16px 24px;
    border-top: 1px solid #3e3e42;
    color: #6e7681;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    background: #28282a;
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
}

.key-hint {
    background: #3e3e42;
    color: #e6e6e6;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 500;
}

/* Responsive design */
@media (max-height: 600px) {
    .config-panel {
        max-height: 90vh;
    }
    
    .config-header {
        padding: 16px 16px 0 16px;
    }
    
    .config-content {
        padding: 0 16px;
    }
    
    .config-footer {
        padding: 12px 16px;
    }
}

@media (max-width: 480px) {
    .config-panel {
        width: 95%;
        margin: 20px;
    }
}
</style>
