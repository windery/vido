<template>
    <div class="quick-options">
        <div 
            v-for="(option, index) in quickOptions" 
            :key="option.value"
            :class="['quick-option', { 
                'focused': quickOptionIndex === index 
            }]"
            @click="_emit('select-option', option.value)"
        >
            <span class="option-number">{{ index + 1 }}</span>
            <span class="option-icon">{{ option.icon }}</span>
            <span class="option-label">{{ option.label }}</span>
            <span class="option-key">{{ index + 1 }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    quickOptionIndex: number;
}

defineProps<Props>();

const _emit = defineEmits<{
    'select-option': [value: string];
}>();

const quickOptions = [
    { value: '今天', label: '今天', icon: '🔥' },
    { value: '明天', label: '明天', icon: '➡️' },
    { value: '下周', label: '下周', icon: '📌' },
    { value: 'clear', label: '清除', icon: '🗑️' }
];
</script>

<style scoped>
.quick-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.quick-option {
    padding: 14px 16px;
    border: 2px solid #3e3e42;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    transition: all 0.2s ease;
    background: #2e2e32;
    color: #e6e6e6;
    min-height: 50px;
    position: relative;
}

.quick-option:hover {
    border-color: #0969da;
    background: #0969da10;
    transform: translateX(2px);
}

.quick-option.focused {
    border-color: #0969da;
    background: #0969da20;
    box-shadow: 0 0 0 3px #0969da30, inset 0 0 0 1px #0969da;
    transform: translateX(4px);
}

.option-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: #4a4a4a;
    color: #e6e6e6;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.quick-option.focused .option-number {
    background: #0969da;
    color: white;
}

.option-icon {
    font-size: 20px;
}

.option-label {
    font-weight: 500;
    flex: 1;
    font-size: 16px;
}

.option-key {
    font-size: 12px;
    color: #6e7681;
    background: #383838;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    min-width: 24px;
    text-align: center;
}

.quick-option.focused .option-key {
    background: #0969da;
    color: white;
}
</style>