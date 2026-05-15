<template>
    <div class="weekly-options">
        <div 
            v-for="(day, index) in weeklyOptions" 
            :key="day.value"
            :class="['weekly-option', { 
                'focused': weeklyOptionIndex === index 
            }]"
            @click="_emit('select-option', day.value)"
        >
            <span class="day-label">{{ day.label }}</span>
            <span class="day-short">{{ day.short }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    weeklyOptionIndex: number;
}

defineProps<Props>();

const _emit = defineEmits<{
    'select-option': [value: string];
}>();

const weeklyOptions = [
    { value: 'mon', label: '周一', short: 'Mon' },
    { value: 'tue', label: '周二', short: 'Tue' },
    { value: 'wed', label: '周三', short: 'Wed' },
    { value: 'thu', label: '周四', short: 'Thu' },
    { value: 'fri', label: '周五', short: 'Fri' },
    { value: 'sat', label: '周六', short: 'Sat' },
    { value: 'sun', label: '周日', short: 'Sun' }
];
</script>

<style scoped>
.weekly-options {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
}

.weekly-option {
    padding: 10px 8px;
    border: 2px solid #3e3e42;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    transition: all 0.2s ease;
    background: #2e2e32;
    color: #e6e6e6;
}

.weekly-option:hover {
    border-color: #0969da;
    background: #0969da10;
    transform: translateY(-1px);
}

.weekly-option.focused {
    border-color: #0969da;
    background: #0969da20;
    box-shadow: 0 0 0 3px #0969da30, inset 0 0 0 1px #0969da;
    transform: translateY(-2px);
}

.day-label {
    font-weight: 500;
}

.day-short {
    font-size: 10px;
    color: #a5a5a5;
}
</style>