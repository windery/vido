<template>
  <div ref="panelRef" class="config-panel" tabindex="-1" @keydown="handleKeydown">
    <div class="config-tabs">
      <div
        v-for="(tab, i) in tabs"
        :key="tab.key"
        :class="['config-tab', { active: currentTab === i }]"
        @click="currentTab = i"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </div>
    </div>

    <div class="config-body">
      <div v-if="currentTab === 0" class="tab-content">
        <SchedulePanel ref="scheduleRef" @select="onScheduleSelect" />
      </div>

      <div v-else-if="currentTab === 1" class="tab-content priority-content">
        <div
          v-for="(p, i) in priorities"
          :key="p.value"
          :class="['priority-option', `priority-${p.value.toLowerCase()}`, { active: priorityIndex === i }]"
        >
          <span class="priority-dot"></span>
          <span class="priority-label">{{ p.label }}</span>
          <span class="priority-hint">{{ p.shortcut }}</span>
        </div>
      </div>

      <div v-else-if="currentTab === 2" class="tab-content tags-content">
        <div v-if="currentTags.length" class="tags-current">
          <span v-for="tag in currentTags" :key="tag" class="tag-badge" @click="removeTag(tag)">
            #{{ tag }} ✕
          </span>
        </div>
        <input
          ref="tagInputRef"
          v-model="tagInput"
          class="tag-input"
          placeholder="输入标签名，Enter 添加"
          @keydown="onTagKeydown"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import SchedulePanel from './config/SchedulePanel.vue';
import { Task, TaskPriority } from '../domain/task';
import { Schedule } from '../domain/schedule';

const props = defineProps<{ task: Task }>();
const emit = defineEmits<{
  'update-task': [taskId: number, field: string, value: any];
  'close': [];
}>();

const currentTab = ref(0);
const tabs = [
  { key: 'schedule', label: '日程', icon: '📅' },
  { key: 'priority', label: '优先级', icon: '⚡' },
  { key: 'tags', label: '标签', icon: '🏷' },
];

const priorityIndex = ref(['P1', 'P2', 'P3'].indexOf(props.task.priority || 'P2'));
const priorities = [
  { value: 'P1', label: '高优先级', shortcut: '1' },
  { value: 'P2', label: '中优先级', shortcut: '2' },
  { value: 'P3', label: '低优先级', shortcut: '3' },
];

function selectPriority(value: string) {
  emit('update-task', props.task.id, 'priority', value as TaskPriority);
}

const tagInput = ref('');
const currentTags = computed(() => props.task.tags || []);

function onTagKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && tagInput.value.trim()) {
    e.preventDefault();
    const newTags = [...currentTags.value, tagInput.value.trim()];
    emit('update-task', props.task.id, 'tags', newTags);
    tagInput.value = '';
  }
}

function removeTag(tag: string) {
  emit('update-task', props.task.id, 'tags', currentTags.value.filter(t => t !== tag));
}

const scheduleRef = ref();
function onScheduleSelect(schedule: Schedule | undefined) {
  emit('update-task', props.task.id, 'schedule', schedule);
}

const panelRef = ref<HTMLElement>();
const tagInputRef = ref<HTMLInputElement>();

function handleKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'h': e.preventDefault(); currentTab.value = Math.max(0, currentTab.value - 1); break;
    case 'l': e.preventDefault(); currentTab.value = Math.min(tabs.length - 1, currentTab.value + 1); break;
    case 'Escape': e.preventDefault(); emit('close'); break;
    default:
      if (currentTab.value === 1) {
        if (/^[1-3]$/.test(e.key)) {
          e.preventDefault();
          const idx = parseInt(e.key) - 1;
          priorityIndex.value = idx;
          selectPriority(priorities[idx].value);
        } else if (e.key === 'j') { e.preventDefault(); priorityIndex.value = Math.min(2, priorityIndex.value + 1); }
        else if (e.key === 'k') { e.preventDefault(); priorityIndex.value = Math.max(0, priorityIndex.value - 1); }
        else if (e.key === 'Enter') { e.preventDefault(); selectPriority(priorities[priorityIndex.value].value); }
      }
  }
}

defineExpose({ focus: () => panelRef.value?.focus() });
</script>

<style scoped>
.config-panel {
  background: rgba(30, 30, 32, 0.85);
  backdrop-filter: blur(12px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  padding: 12px;
  margin-top: 4px;
  outline: none;
}

.config-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}

.config-tab {
  flex: 1; text-align: center; padding: 6px 0; border-radius: 6px;
  font-size: 11px; font-family: system-ui, -apple-system, sans-serif;
  text-transform: uppercase; letter-spacing: 0.5px; color: #888;
  cursor: pointer; background: transparent; transition: all 150ms ease;
}

.config-tab.active { color: #e1e1e1; background: rgba(255, 255, 255, 0.06); }
.tab-icon { margin-right: 4px; }

.config-body { min-height: 60px; }

.priority-option {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 8px; background: #2a2a2e;
  margin-bottom: 6px; cursor: pointer; transition: all 100ms ease;
}

.priority-option:hover, .priority-option.active {
  transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.priority-dot { width: 10px; height: 10px; border-radius: 50%; }
.priority-p1 .priority-dot { background: #f85149; }
.priority-p2 .priority-dot { background: #d29922; }
.priority-p3 .priority-dot { background: #58a6ff; }

.priority-label { color: #e1e1e1; flex: 1; }
.priority-hint { color: #666; font-size: 11px; }

.tags-current { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }

.tag-badge {
  background: #264f78; color: #79c0ff;
  padding: 3px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;
}

.tag-input {
  width: 100%; padding: 8px 12px; border: 1px solid #3e3e42; border-radius: 6px;
  background: #2e2e32; color: #e1e1e1; font-size: 13px; font-family: monospace;
  box-sizing: border-box;
}

.tag-input:focus { outline: none; border-color: #1976D2; box-shadow: 0 0 0 2px rgba(25,118,210,0.3); }
</style>
