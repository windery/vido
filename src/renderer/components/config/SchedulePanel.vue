<template>
  <div class="schedule-panel">
    <div v-if="mode === 'quick'" class="quick-options">
      <div
        v-for="(opt, i) in quickOptions"
        :key="opt.value"
        :class="['quick-option', { active: quickIndex === i }]"
      >
        <span class="option-icon">{{ opt.icon }}</span>
        <span class="option-label">{{ opt.label }}</span>
        <span class="option-hint">{{ i + 1 }}</span>
      </div>
    </div>

    <div v-else class="smart-input-area">
      <input
        ref="inputRef"
        v-model="inputValue"
        class="smart-input"
        placeholder="e.g. 2026-05-20, 周一, 14:30-17:30"
        @keydown="onInputKeydown"
      />
      <div v-if="parseResult" :class="['parse-preview', parseResult.valid ? 'valid' : 'invalid']">
        {{ parseResult.text }}
      </div>
      <div class="input-hint">Enter 确认 · Esc 取消 · / 回到快捷选择</div>
    </div>

    <div class="schedule-footer">
      <span class="key-hint">1-5</span> select ·
      <span class="key-hint">/</span> custom ·
      <span class="key-hint">h/l</span> switch tab
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { parseScheduleFromString, getScheduleDisplayText } from '../../utils/schedule-helper';
import { Schedule } from '../../domain/schedule';

const emit = defineEmits<{ 'select': [schedule: Schedule | undefined] }>();

const mode = ref<'quick' | 'input'>('quick');
const quickIndex = ref(0);
const inputValue = ref('');
const inputRef = ref<HTMLInputElement>();

const quickOptions = [
  { value: 'today', label: '今天', icon: '⚡' },
  { value: 'tomorrow', label: '明天', icon: '➡️' },
  { value: 'next_week', label: '下周', icon: '📌' },
  { value: 'custom', label: '自定义', icon: '📆' },
  { value: 'clear', label: '清除', icon: '🗑' },
];

const parseResult = computed(() => {
  if (!inputValue.value.trim()) return null;
  const s = parseScheduleFromString(inputValue.value.trim());
  if (s) return { valid: true, text: getScheduleDisplayText(s), schedule: s };
  return { valid: false, text: '无法识别的时间格式', schedule: undefined };
});

function selectQuick(value: string) {
  if (value === 'custom') {
    mode.value = 'input';
    nextTick(() => inputRef.value?.focus());
  } else if (value === 'clear') {
    emit('select', undefined);
  } else {
    const s = parseScheduleFromString(value);
    if (s) emit('select', s);
  }
}

function onInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && parseResult.value?.valid) {
    e.preventDefault();
    emit('select', parseResult.value.schedule);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    inputValue.value = '';
    mode.value = 'quick';
  } else if (e.key === '/') {
    e.preventDefault();
    mode.value = 'quick';
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (mode.value === 'input') return;
  switch (e.key) {
    case 'j': e.preventDefault(); quickIndex.value = Math.min(quickOptions.length - 1, quickIndex.value + 1); break;
    case 'k': e.preventDefault(); quickIndex.value = Math.max(0, quickIndex.value - 1); break;
    case 'Enter': e.preventDefault(); selectQuick(quickOptions[quickIndex.value].value); break;
    case '/': e.preventDefault(); mode.value = 'input'; nextTick(() => inputRef.value?.focus()); break;
    default:
      if (/^[1-5]$/.test(e.key)) {
        e.preventDefault();
        selectQuick(quickOptions[parseInt(e.key) - 1].value);
      }
  }
}

defineExpose({ handleKeydown });
</script>

<style scoped>
.schedule-panel { padding: 4px 0; }
.quick-options { display: flex; gap: 4px; flex-wrap: wrap; }
.quick-option {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 12px; border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer; transition: background 100ms ease; flex: 1; min-width: 80px;
}
.quick-option:hover { background: rgba(255, 255, 255, 0.06); }
.quick-option.active { background: rgba(25, 118, 210, 0.15); }
.option-icon { font-size: 14px; }
.option-label { color: #e1e1e1; font-size: 12px; font-family: system-ui, -apple-system, sans-serif; }
.option-hint { color: #666; font-size: 10px; margin-left: auto; }
.smart-input-area { padding: 8px 0; }
.smart-input {
  width: 100%; padding: 8px 12px; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px;
  background: rgba(255, 255, 255, 0.03); color: #e1e1e1; font-size: 13px; font-family: monospace;
  box-sizing: border-box;
}
.smart-input:focus { outline: none; border-color: #1976D2; }
.parse-preview { margin-top: 6px; padding: 6px 10px; border-radius: 4px; font-size: 12px; }
.parse-preview.valid { color: #3fb950; background: rgba(63,185,80,0.1); }
.parse-preview.invalid { color: #f85149; background: rgba(248,81,73,0.1); }
.input-hint { color: #666; font-size: 11px; margin-top: 6px; }
.schedule-footer { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); color: #666; font-size: 11px; font-family: system-ui, -apple-system, sans-serif; }
.key-hint { background: rgba(255, 255, 255, 0.08); color: #e1e1e1; padding: 1px 5px; border-radius: 3px; font-family: monospace; font-size: 10px; }
</style>
