# Config Panel Inline Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the modal TaskConfig overlay with an inline expandable config panel on the selected task row.

**Architecture:** Config expands inline within TaskItem.vue. No mode switch — cc toggles isConfigExpanded in TaskDataState. Keyboard events handled by ConfigPanel internally (no chain delegation). Old 8-component tree replaces with 2 new files.

**Tech Stack:** Vue 3 + TypeScript, no new dependencies.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/renderer/domain/task.ts` | Modify | Add `isConfigExpanded?: boolean` to Task |
| `src/renderer/domain/core/task-data-manager.ts` | Modify | Replace showTaskConfig/exitTaskConfig with toggleConfigPanel |
| `src/renderer/domain/editor.ts` | Modify | Remove TASK_CONFIG from EditorMode enum |
| `src/renderer/domain/state-machine.ts` | Modify | Remove TASK_CONFIG transitions |
| `src/renderer/domain/keyboard/command-mode-handler.ts` | Modify | cc → toggleConfigPanel(), Esc → close config first |
| `src/renderer/components/TaskItem.vue` | Modify | Add inline config panel slot with animation |
| `src/renderer/components/ConfigPanel.vue` | Create | Tab switching, key handling, delegates to schedule/priority/tags |
| `src/renderer/components/config/SchedulePanel.vue` | Create | Quick select + smart input |
| `src/renderer/App.vue` | Modify | Remove TaskConfig, handleTaskConfigKeydown, TASK_CONFIG listener |
| `src/renderer/components/HelpPanel.vue` | Modify | Update help text for cc |
| `src/renderer/components/TaskConfig.vue` | Delete | Replaced by inline ConfigPanel |
| `src/renderer/components/config/ScheduleConfig.vue` | Delete | Replaced by SchedulePanel |
| `src/renderer/components/config/PriorityConfig.vue` | Delete | Inlined in ConfigPanel |
| `src/renderer/components/config/TagsConfig.vue` | Delete | Inlined in ConfigPanel |
| `src/renderer/components/config/schedule/QuickOptionsTab.vue` | Delete | Replaced by SchedulePanel |
| `src/renderer/components/config/schedule/DateInputTab.vue` | Delete | Replaced by SchedulePanel |
| `src/renderer/components/config/schedule/WeeklyOptionsTab.vue` | Delete | Replaced by SchedulePanel |
| `src/renderer/components/config/schedule/RangeInputTab.vue` | Delete | Replaced by SchedulePanel |

---

### Task 1: Update Task domain model

**Files:**
- Modify: `src/renderer/domain/task.ts:13`

- [ ] **Step 1: Add isConfigExpanded field**

```typescript
// in class Task, add after schedule?:
schedule?: Schedule;
isConfigExpanded?: boolean;  // 配置面板展开状态（UI 状态，不持久化）
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/domain/task.ts
git commit -m "feat: add isConfigExpanded field to Task for inline config panel"
```

---

### Task 2: Update TaskDataManager — replace showTaskConfig with toggleConfigPanel

**Files:**
- Modify: `src/renderer/domain/core/task-data-manager.ts:348-395`

- [ ] **Step 1: Delete showTaskConfig and exitTaskConfig methods**

Delete lines 348-395 (both methods).

- [ ] **Step 2: Add toggleConfigPanel method**

```typescript
toggleConfigPanel(): void {
  const state = this.getTaskDataState();
  const selectedTaskId = state.selectedTaskId;
  if (!selectedTaskId) return;

  const tasks = state.tasks.map((task) =>
    task.id === selectedTaskId
      ? { ...task, isConfigExpanded: !task.isConfigExpanded }
      : { ...task, isConfigExpanded: false }
  );

  this.updateState({ tasks } as Partial<TaskDataState>, 'toggle-config');
}
```

- [ ] **Step 3: Remove isTaskConfigVisible from TaskDataState interface**

Change line 23:
```typescript
// Before:
isTaskConfigVisible: boolean;
// After:
// removed — config now inline in TaskItem, tracked via Task.isConfigExpanded
```

And line 48:
```typescript
// Remove:
isTaskConfigVisible: false,
```

- [ ] **Step 4: Verify typecheck**

```bash
pnpm typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/domain/core/task-data-manager.ts
git commit -m "refactor: replace showTaskConfig/exitTaskConfig with toggleConfigPanel"
```

---

### Task 3: Remove TASK_CONFIG editor mode

**Files:**
- Modify: `src/renderer/domain/editor.ts`
- Modify: `src/renderer/domain/state-machine.ts`
- Modify: `src/renderer/components/ModeDebug.vue`

- [ ] **Step 1: Remove TASK_CONFIG from EditorMode**

In `src/renderer/domain/editor.ts`, delete the `TASK_CONFIG = 5` line:

```typescript
export enum EditorMode {
  COMMAND = 0,
  TITLE_EDIT = 1,
  CONTENT_EDIT = 2,
  LAST_LINE = 3,
  CONTENT_NAVIGATION = 4,
  // TASK_CONFIG removed — cc now stays in COMMAND mode
}
```

- [ ] **Step 2: Remove TASK_CONFIG transitions from state-machine.ts**

Delete lines 46-51 (COMMAND → TASK_CONFIG transition), lines 115-121 (TASK_CONFIG → COMMAND escape), and line 144 (TASK_CONFIG case in deriveTaskState).

- [ ] **Step 3: Remove TASK_CONFIG from ModeDebug.vue**

In `src/renderer/components/ModeDebug.vue`, find and remove any `TASK_CONFIG` references (lines ~25, ~64, ~100 from earlier grep).

- [ ] **Step 4: Verify typecheck**

```bash
pnpm typecheck
```

Expected: PASS (may have errors in App.vue/keyboard-manager — those get fixed in next tasks)

- [ ] **Step 5: Commit**

```bash
git add src/renderer/domain/editor.ts src/renderer/domain/state-machine.ts src/renderer/components/ModeDebug.vue
git commit -m "refactor: remove TASK_CONFIG editor mode (cc stays in COMMAND)"
```

---

### Task 4: Create SchedulePanel.vue

**Files:**
- Create: `src/renderer/components/config/SchedulePanel.vue`

- [ ] **Step 1: Write SchedulePanel.vue**

```vue
<template>
  <div class="schedule-panel">
    <!-- 快捷选择 -->
    <div v-if="mode === 'quick'" class="quick-options">
      <div
        v-for="(opt, i) in quickOptions"
        :key="opt.value"
        :class="['quick-option', { active: quickIndex === i }]"
        @click="selectQuick(opt.value)"
      >
        <span class="option-icon">{{ opt.icon }}</span>
        <span class="option-label">{{ opt.label }}</span>
        <span class="option-hint">{{ i + 1 }}</span>
      </div>
    </div>

    <!-- 智能输入 -->
    <div v-else class="smart-input-area">
      <input
        ref="inputRef"
        v-model="inputValue"
        class="smart-input"
        placeholder="e.g. 2026-05-20, 周一, 14:30-17:30"
        @input="onInput"
        @keydown="onInputKeydown"
      />
      <div v-if="parseResult" :class="['parse-preview', parseResult.valid ? 'valid' : 'invalid']">
        {{ parseResult.text }}
      </div>
      <div class="input-hint">Enter 确认 · Esc 取消 · / 回到快捷选择</div>
    </div>

    <!-- 提示行 -->
    <div class="schedule-footer">
      <span class="key-hint">1-5</span> select ·
      <span class="key-hint">/</span> custom ·
      <span class="key-hint">h/l</span> switch tab
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { parseScheduleFromString, getScheduleDisplayText } from '../../utils/schedule-helper';
import { Schedule, ScheduleType } from '../../domain/schedule';

const emit = defineEmits<{
  'select': [schedule: Schedule | undefined];
}>();

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
  return { valid: false, text: '无法识别的时间格式', schedule: null };
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

function onInput() {
  // parseResult computed reacts automatically
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
  if (mode.value === 'input') return; // input handles its own keys

  switch (e.key) {
    case 'j':
      e.preventDefault();
      quickIndex.value = Math.min(quickOptions.length - 1, quickIndex.value + 1);
      break;
    case 'k':
      e.preventDefault();
      quickIndex.value = Math.max(0, quickIndex.value - 1);
      break;
    case 'Enter':
      e.preventDefault();
      selectQuick(quickOptions[quickIndex.value].value);
      break;
    case '/':
      e.preventDefault();
      mode.value = 'input';
      nextTick(() => inputRef.value?.focus());
      break;
    default:
      if (/^[1-5]$/.test(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        selectQuick(quickOptions[idx].value);
      }
  }
}

defineExpose({ handleKeydown });
</script>
```

- [ ] **Step 2: Write tests**

Create `src/renderer/components/__tests__/SchedulePanel.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SchedulePanel from '../config/SchedulePanel.vue';

describe('SchedulePanel', () => {
  it('renders 5 quick options', () => {
    const wrapper = mount(SchedulePanel);
    expect(wrapper.findAll('.quick-option')).toHaveLength(5);
  });

  it('navigates options with j/k', async () => {
    const wrapper = mount(SchedulePanel);
    await wrapper.vm.handleKeydown(new KeyboardEvent('keydown', { key: 'j' }));
    expect(wrapper.vm.quickIndex).toBe(1);
    await wrapper.vm.handleKeydown(new KeyboardEvent('keydown', { key: 'k' }));
    expect(wrapper.vm.quickIndex).toBe(0);
  });

  it('selects option with number key', async () => {
    const wrapper = mount(SchedulePanel);
    const emitted = wrapper.emitted('select');
    await wrapper.vm.handleKeydown(new KeyboardEvent('keydown', { key: '1' }));
    expect(emitted).toBeTruthy();
  });

  it('switches to input mode on /', async () => {
    const wrapper = mount(SchedulePanel);
    await wrapper.vm.handleKeydown(new KeyboardEvent('keydown', { key: '/' }));
    expect(wrapper.vm.mode).toBe('input');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

Expected: 4 new tests PASS, all existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/config/SchedulePanel.vue src/renderer/components/__tests__/SchedulePanel.test.ts
git commit -m "feat: add SchedulePanel with quick select + smart input"
```

---

### Task 5: Create ConfigPanel.vue

**Files:**
- Create: `src/renderer/components/ConfigPanel.vue`

- [ ] **Step 1: Write ConfigPanel.vue**

```vue
<template>
  <div class="config-panel" @keydown="handleKeydown" tabindex="-1" ref="panelRef">
    <!-- Tab 行 -->
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

    <!-- Tab 内容 -->
    <div class="config-body">
      <!-- 日程 -->
      <div v-if="currentTab === 0" class="tab-content">
        <SchedulePanel ref="scheduleRef" @select="onScheduleSelect" />
      </div>

      <!-- 优先级 -->
      <div v-else-if="currentTab === 1" class="tab-content priority-content">
        <div
          v-for="(p, i) in priorities"
          :key="p.value"
          :class="['priority-option', `priority-${p.value.toLowerCase()}`, { active: priorityIndex === i }]"
          @click="selectPriority(p.value)"
        >
          <span class="priority-dot"></span>
          <span class="priority-label">{{ p.label }}</span>
          <span class="priority-hint">{{ p.shortcut }}</span>
        </div>
      </div>

      <!-- 标签 -->
      <div v-else-if="currentTab === 2" class="tab-content tags-content">
        <div class="tags-current" v-if="currentTags.length">
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

// Priority
const priorityIndex = ref(['P1', 'P2', 'P3'].indexOf(props.task.priority || 'P2'));
const priorities = [
  { value: 'P1', label: '高优先级', shortcut: '1' },
  { value: 'P2', label: '中优先级', shortcut: '2' },
  { value: 'P3', label: '低优先级', shortcut: '3' },
];

function selectPriority(value: string) {
  emit('update-task', props.task.id, 'priority', value as TaskPriority);
}

// Tags
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

// Schedule
const scheduleRef = ref();
function onScheduleSelect(schedule: Schedule | undefined) {
  emit('update-task', props.task.id, 'schedule', schedule);
}

// Keyboard
const panelRef = ref<HTMLElement>();
function handleKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'h':
      e.preventDefault();
      currentTab.value = Math.max(0, currentTab.value - 1);
      break;
    case 'l':
      e.preventDefault();
      currentTab.value = Math.min(tabs.length - 1, currentTab.value + 1);
      break;
    case 'Escape':
      e.preventDefault();
      if (currentTab.value === 2 && document.activeElement === tagInputRef.value) {
        break; // let tag input handle its own Escape
      }
      emit('close');
      break;
    default:
      // Delegate to active tab
      if (currentTab.value === 0) {
        scheduleRef.value?.handleKeydown(e);
      } else if (currentTab.value === 1) {
        if (/^[1-3]$/.test(e.key)) {
          e.preventDefault();
          const idx = parseInt(e.key) - 1;
          selectPriority(priorities[idx].value);
        } else if (e.key === 'j') {
          e.preventDefault();
          priorityIndex.value = Math.min(2, priorityIndex.value + 1);
        } else if (e.key === 'k') {
          e.preventDefault();
          priorityIndex.value = Math.max(0, priorityIndex.value - 1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          selectPriority(priorities[priorityIndex.value].value);
        }
      }
  }
}

const tagInputRef = ref<HTMLInputElement>();
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
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 200ms cubic-bezier(0.16, 1, 0.3, 1),
              opacity 200ms cubic-bezier(0.16, 1, 0.3, 1);
  outline: none;
}

.config-panel.expanded {
  max-height: 240px;
  opacity: 1;
}

.config-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}

.config-tab {
  flex: 1;
  text-align: center;
  padding: 6px 0;
  border-radius: 6px;
  font-size: 11px;
  font-family: system-ui, -apple-system, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
  cursor: pointer;
  background: transparent;
  transition: all 150ms ease;
}

.config-tab.active {
  color: #e1e1e1;
  background: rgba(255, 255, 255, 0.06);
}

.tab-icon { margin-right: 4px; }

/* Priority */
.priority-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #2a2a2e;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 100ms ease;
}

.priority-option:hover, .priority-option.active {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.priority-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.priority-p1 .priority-dot { background: #f85149; }
.priority-p2 .priority-dot { background: #d29922; }
.priority-p3 .priority-dot { background: #58a6ff; }

.priority-label { color: #e1e1e1; flex: 1; }
.priority-hint { color: #666; font-size: 11px; }

/* Tags */
.tags-current { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }

.tag-badge {
  background: #264f78;
  color: #79c0ff;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.tag-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #3e3e42;
  border-radius: 6px;
  background: #2e2e32;
  color: #e1e1e1;
  font-size: 13px;
  font-family: monospace;
}

.tag-input:focus {
  outline: none;
  border-color: #1976D2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.3);
}
</style>
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/ConfigPanel.vue
git commit -m "feat: add ConfigPanel with inline tabs for schedule/priority/tags"
```

---

### Task 6: Update TaskItem.vue — inline config expansion

**Files:**
- Modify: `src/renderer/components/TaskItem.vue`

- [ ] **Step 1: Add config panel section to template**

After the existing `.task-line` div, before the `TaskContent` component:

```vue
<!-- Config Panel (inline expansion) -->
<div v-if="task.isConfigExpanded" class="config-wrapper" :class="{ expanded: task.isConfigExpanded }">
  <ConfigPanel
    :task="task"
    @update-task="onConfigUpdate"
    @close="onConfigClose"
  />
</div>
```

- [ ] **Step 2: Add ConfigPanel import and handler methods**

In the script section:
```typescript
import ConfigPanel from './ConfigPanel.vue';

const onConfigUpdate = (taskId: number, field: string, value: any) => {
  const taskState = useTaskState();
  taskState.taskDataManager.updateTaskProperty(taskId, field, value);
};

const onConfigClose = () => {
  const taskState = useTaskState();
  taskState.taskDataManager.toggleConfigPanel();
};
```

- [ ] **Step 3: Add expansion CSS**

```css
.config-wrapper {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 200ms cubic-bezier(0.16, 1, 0.3, 1),
              opacity 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.config-wrapper.expanded {
  max-height: 300px;
  opacity: 1;
}
```

- [ ] **Step 4: Verify typecheck**

```bash
pnpm typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/TaskItem.vue
git commit -m "feat: add inline config panel expansion to TaskItem"
```

---

### Task 7: Update CommandModeHandler — cc toggles config

**Files:**
- Modify: `src/renderer/domain/keyboard/command-mode-handler.ts:181-194`

- [ ] **Step 1: Change cc handler**

Replace:
```typescript
case 'c':
  this.keySequence += key;
  if (this.keySequence === 'cc') {
    event.preventDefault();
    taskDataManager.showTaskConfig();
    this.resetAll();
    return true;
  }
  this.setKeySequenceTimeout();
  event.preventDefault();
  return true;
```

With:
```typescript
case 'c':
  this.keySequence += key;
  if (this.keySequence === 'cc') {
    event.preventDefault();
    taskDataManager.toggleConfigPanel();
    // 不滚动 — 配置面板在当前位置展开
    this.resetAll();
    return true;
  }
  this.setKeySequenceTimeout();
  event.preventDefault();
  return true;
```

- [ ] **Step 2: Add Esc handler to close config first**

Add before the existing `case 'Escape'` logic: if config is expanded, close it. The simplest approach — have `taskDataManager` expose a way to close config, or handle it inline.

Actually, the Esc should work like this: if config is expanded → close config. Otherwise → normal Esc behavior. But the CommandModeHandler doesn't know about config state.

Better approach: TaskItem.vue watches for Esc key globally when config is expanded. Or, simpler: `toggleConfigPanel()` always closes if any config is open.

Simplest fix: when Esc is pressed and any task has isConfigExpanded, close all configs:

```typescript
case 'Escape':
  // Close config panel first if open (cc is toggled, Esc closes)
  taskDataManager.closeConfigPanel();
  if (currentState.lastlineContent?.startsWith('/')) {
    event.preventDefault();
    taskDataManager.transition('Escape');
  }
  this.resetAll();
  return true;
```

And add `closeConfigPanel()` to TaskDataManager:
```typescript
closeConfigPanel(): void {
  const state = this.getTaskDataState();
  const tasks = state.tasks.map((task) => ({ ...task, isConfigExpanded: false }));
  this.updateState({ tasks } as Partial<TaskDataState>, 'close-config');
}
```

- [ ] **Step 3: Add closeConfigPanel to TaskDataManager**

Add the method from step 2 to `task-data-manager.ts`.

- [ ] **Step 4: Run typecheck and tests**

```bash
pnpm typecheck && pnpm test
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/domain/keyboard/command-mode-handler.ts src/renderer/domain/core/task-data-manager.ts
git commit -m "refactor: cc toggles config, Esc closes inline config"
```

---

### Task 8: Clean up App.vue and keyboard-manager

**Files:**
- Modify: `src/renderer/App.vue`
- Modify: `src/renderer/domain/keyboard/keyboard-manager.ts`

- [ ] **Step 1: Remove TaskConfig from App.vue**

Remove:
- `import TaskConfig from "@components/TaskConfig.vue"` (line 5)
- `const showTaskConfig = computed(...)` (lines 27-29)
- `const hideTaskConfig = () => {...}` (lines 31-33)
- `const taskConfigRef = ref()` (line 15)
- `const handleTaskConfigKeydown = (event) => {...}` (lines 39-43)
- The document keydown listener for TASK_CONFIG (lines 54-67)
- `<TaskConfig ...>` from template (line 81-82)
- `isTaskConfigVisible` from useTaskState destructuring (line 12)

- [ ] **Step 2: Remove TASK_CONFIG case from keyboard-manager.ts**

In `handleKeyBasedOnEditorMode`, remove:
```typescript
case EditorMode.TASK_CONFIG:
  break;
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/App.vue src/renderer/domain/keyboard/keyboard-manager.ts
git commit -m "refactor: remove TaskConfig overlay and TASK_CONFIG mode routing"
```

---

### Task 9: Delete old components

**Files to delete:**
- `src/renderer/components/TaskConfig.vue`
- `src/renderer/components/config/ScheduleConfig.vue`
- `src/renderer/components/config/PriorityConfig.vue`
- `src/renderer/components/config/TagsConfig.vue`
- `src/renderer/components/config/schedule/QuickOptionsTab.vue`
- `src/renderer/components/config/schedule/DateInputTab.vue`
- `src/renderer/components/config/schedule/WeeklyOptionsTab.vue`
- `src/renderer/components/config/schedule/RangeInputTab.vue`

- [ ] **Step 1: Delete all 8 files**

```bash
rm src/renderer/components/TaskConfig.vue
rm src/renderer/components/config/ScheduleConfig.vue
rm src/renderer/components/config/PriorityConfig.vue
rm src/renderer/components/config/TagsConfig.vue
rm src/renderer/components/config/schedule/QuickOptionsTab.vue
rm src/renderer/components/config/schedule/DateInputTab.vue
rm src/renderer/components/config/schedule/WeeklyOptionsTab.vue
rm src/renderer/components/config/schedule/RangeInputTab.vue
```

- [ ] **Step 2: Run full verification**

```bash
pnpm typecheck && pnpm test
```

Expected: all PASS, no import errors

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: delete old config panel components (8 files, ~1500 lines)"
```

---

### Task 10: Update HelpPanel text

**Files:**
- Modify: `src/renderer/components/HelpPanel.vue`

- [ ] **Step 1: Update cc help text**

Change line 24:
```html
<!-- Before -->
<div class="help-command"><span class="key">cc</span> Configure task (schedule/priority/tags)</div>

<!-- After -->
<div class="help-command"><span class="key">cc</span> Expand task config inline (schedule/priority/tags)</div>
```

- [ ] **Step 2: Add new command help entries**

After the existing schedule commands section, add:
```html
<div class="help-command"><span class="key">:p [1|2|3]</span> Set task priority</div>
<div class="help-command"><span class="key">:t [tag]</span> Add tag to task</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/HelpPanel.vue
git commit -m "docs: update help text for inline config and :p/:t commands"
```

---

### Task 11: Add command-line :p and :t support

**Files:**
- Modify: `src/renderer/domain/keyboard/lastline-mode-handler.ts`

- [ ] **Step 1: Add :p and :t commands**

Add to the `executeVimCommand` switch:
```typescript
case 'p':
  this.setTaskPriority(args, taskDataManager);
  break;
case 't':
case 'tag':
  this.setTaskTags(args, taskDataManager);
  break;
```

- [ ] **Step 2: Implement setTaskPriority**

```typescript
private setTaskPriority(args: string[], taskDataManager: TaskDataManager): void {
  const taskId = taskDataManager.getState().selectedTaskId;
  if (!taskId) return;

  if (args.length === 0) {
    // Cycle: P2 → P1 → P3 → P2
    const task = taskDataManager.getTaskDataState().tasks.find(t => t.id === taskId);
    const cycle: TaskPriority[] = [TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.LOW, TaskPriority.MEDIUM];
    const idx = cycle.indexOf(task?.priority || TaskPriority.MEDIUM);
    taskDataManager.updateTaskProperty(taskId, 'priority', cycle[idx + 1]);
  } else {
    const map: Record<string, TaskPriority> = { '1': TaskPriority.HIGH, '2': TaskPriority.MEDIUM, '3': TaskPriority.LOW };
    const p = map[args[0]] || (args[0].toUpperCase() as TaskPriority);
    if (p) taskDataManager.updateTaskProperty(taskId, 'priority', p);
  }
}
```

- [ ] **Step 3: Implement setTaskTags**

```typescript
private setTaskTags(args: string[], taskDataManager: TaskDataManager): void {
  const taskId = taskDataManager.getState().selectedTaskId;
  if (!taskId) return;

  const task = taskDataManager.getTaskDataState().tasks.find(t => t.id === taskId);
  if (!task) return;

  if (args.length === 0) {
    // Show current tags
    const tags = task.tags?.join(', ') || '(none)';
    logger.info('LastLineModeHandler', `Tags: ${tags}`);
  } else {
    const newTag = args.join(' ');
    const currentTags = task.tags || [];
    if (!currentTags.includes(newTag)) {
      taskDataManager.updateTaskProperty(taskId, 'tags', [...currentTags, newTag]);
    }
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: all PASS

- [ ] **Step 5: Final full verification**

```bash
pnpm typecheck && pnpm test
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/domain/keyboard/lastline-mode-handler.ts
git commit -m "feat: add :p and :t commands for priority and tag editing"
```

---

### Task 12: Final cleanup and verification

- [ ] **Step 1: Check for any remaining references to deleted files**

```bash
grep -rn "TaskConfig\|task-config-mode-handler\|isTaskConfigVisible\|EditorMode.TASK_CONFIG" src/renderer/ --include="*.ts" --include="*.vue" | grep -v node_modules | grep -v __tests__
```

Expected: zero matches

- [ ] **Step 2: Full test suite**

```bash
pnpm typecheck && pnpm test && pnpm lint
```

Expected: all PASS

- [ ] **Step 3: Run the app and test manually**

```bash
pnpm dev
# Test: j/k to select task → cc → config expands inline
# Test: h/l switch tabs → 1 select schedule → Esc close
# Test: :p 1 → set priority
# Test: :t bug → add tag
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: final cleanup, remove all TASK_CONFIG references"
```
