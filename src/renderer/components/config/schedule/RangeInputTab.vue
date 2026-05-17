<template>
    <div class="range-input">
        <div v-if="!isActive" class="range-prompt">
            <div class="prompt-text">
                <span class="prompt-icon">📊</span>
                <span>按 Enter 进入范围输入</span>
            </div>
            <div class="input-hint">Format: YYYY-MM-DD</div>
        </div>
        <div v-else class="range-input-active">
            <div class="range-row">
                <label>从:</label>
                <input 
                    ref="rangeStartInput" 
                    v-model="localStartValue" 
                    @keydown="handleInputKeydown"
                    placeholder="2025-08-01" 
                    class="config-input small" 
                />
            </div>
            <div class="range-row">
                <label>到:</label>
                <input 
                    ref="rangeEndInput" 
                    v-model="localEndValue" 
                    @keydown="handleInputKeydown"
                    placeholder="2025-08-07" 
                    class="config-input small" 
                />
            </div>
            <div class="input-hint">按 Enter 保存，Esc 取消</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { logger } from '../../../utils/logger';

interface Props {
    isActive: boolean;
    rangeStart: string;
    rangeEnd: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    'activate': [];
    'save': [startDate: string, endDate: string];
    'deactivate': [];
}>();

const rangeStartInput = ref<HTMLInputElement>();
const rangeEndInput = ref<HTMLInputElement>();
const localStartValue = ref('');
const localEndValue = ref('');

// Watch for activation to focus input
watch(() => props.isActive, (isActive) => {
    if (isActive) {
        nextTick(() => {
            rangeStartInput.value?.focus();
        });
    }
});

const handleInputKeydown = (event: KeyboardEvent) => {
    logger.debug('RangeInputTab', `handleInputKeydown: ${event.key}`);
    
    if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        if (localStartValue.value && localEndValue.value) {
            logger.debug('RangeInputTab', 'Saving range input');
            emit('save', localStartValue.value, localEndValue.value);
            localStartValue.value = '';
            localEndValue.value = '';
        }
    } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        logger.debug('RangeInputTab', 'Canceling range input');
        localStartValue.value = '';
        localEndValue.value = '';
        emit('deactivate');
    }
};
</script>

<style scoped>
.range-input {
    padding: 12px 0;
}

.range-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    border: 2px dashed #3e3e42;
    border-radius: 8px;
    background: #2e2e32;
    color: #a5a5a5;
}

.prompt-text {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    margin-bottom: 8px;
    color: #e6e6e6;
}

.prompt-icon {
    font-size: 18px;
}

.range-input-active {
    padding: 12px 0;
}

.range-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.range-row label {
    width: 30px;
    font-size: 12px;
    color: #a5a5a5;
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

.config-input.small {
    flex: 1;
    min-width: 0;
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