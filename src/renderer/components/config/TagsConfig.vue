<template>
    <div class="tags-config">
        <div class="current-value">
            {{ getTagsDisplayText() }}
        </div>
        <div v-if="isEditing" class="edit-area">
            <input
                ref="tagsInput"
                v-model="editValue"
                @keydown="handleInputKeydown"
                placeholder="tag1, tag2, tag3"
                class="config-input"
            />
            <div class="input-hint">Separate tags with commas</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { Task } from '../../domain/task';
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

const tagsInput = ref<HTMLInputElement>();
const editValue = ref('');

// Watch for editing activation to focus input and load current value
watch(() => props.isEditing, (isEditing) => {
    if (isEditing) {
        // Load current tags into edit value
        editValue.value = (props.task?.tags || []).join(', ');
        nextTick(() => {
            tagsInput.value?.focus();
        });
    }
});

const handleInputKeydown = (event: KeyboardEvent) => {
    logger.debug('TagsConfig', `handleInputKeydown: ${event.key}`);
    
    if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        logger.debug('TagsConfig', 'Canceling tags edit');
        editValue.value = '';
        emit('deactivate');
    } else if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        logger.debug('TagsConfig', 'Saving tags');
        saveTags();
    }
};

const saveTags = () => {
    if (!props.task) return;

    const tagsText = editValue.value.trim();
    let tags: string[] = [];
    
    if (tagsText !== '') {
        tags = tagsText.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    }
    
    logger.debug('TagsConfig', `Saving tags: ${JSON.stringify(tags)}`);
    emit('update-task', props.task.id, 'tags', tags);
    editValue.value = '';
    emit('deactivate');
};

const getTagsDisplayText = () => {
    if (!props.task?.tags || props.task.tags.length === 0) {
        return 'No tags set';
    }
    return props.task.tags.join(', ');
};

// Handle keyboard events (exposed for parent)
const handleKeydown = (event: KeyboardEvent) => {
    logger.debug('TagsConfig', `handleKeydown: ${event.key}`);
    
    switch (event.key) {
        case 'Escape':
            event.preventDefault();
            event.stopPropagation();
            emit('deactivate');
            return;
    }
};

// Expose methods for parent component
defineExpose({
    handleKeydown,
    resetState: () => {
        editValue.value = '';
    }
});
</script>

<style scoped>
.tags-config {
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

.config-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #3e3e42;
    border-radius: 6px;
    background: #2e2e32;
    color: #e6e6e6;
    font-size: 14px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.config-input:focus {
    outline: none;
    border-color: #0969da;
    box-shadow: 0 0 0 2px #0969da40;
}

.input-hint {
    color: #6e7681;
    font-size: 11px;
    margin-top: 4px;
    font-style: italic;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}
</style>
