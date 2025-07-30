<template>
  <div v-if="visible" class="help-overlay" @click="$emit('close')">
    <div class="help-panel" @click.stop>
      <div class="help-header">
        <h2>Vido - Vim-style Todo Manager</h2>
      </div>
      <div class="help-content">
        <div class="help-section">
          <h3>NORMAL MODE</h3>
          <div class="help-commands">
            <div class="help-command"><span class="key">j/k</span> Navigate up/down</div>
            <div class="help-command"><span class="key">Enter</span> Edit task title</div>
            <div class="help-command"><span class="key">i</span> Content navigation mode</div>
            <div class="help-command"><span class="key">Space</span> Toggle completion</div>
            <div class="help-command"><span class="key">o</span> New task below</div>
            <div class="help-command"><span class="key">O</span> New task above</div>
            <div class="help-command"><span class="key">dd</span> Delete task</div>
            <div class="help-command"><span class="key">yy</span> Copy task</div>
            <div class="help-command"><span class="key">p</span> Paste task</div>
            <div class="help-command"><span class="key">gg</span> Go to first task</div>
            <div class="help-command"><span class="key">G</span> Go to last task</div>
            <div class="help-command"><span class="key">/</span> Search tasks</div>
            <div class="help-command"><span class="key">:</span> Enter command mode</div>
            <div class="help-command"><span class="key">cc</span> Configure task (schedule/priority/tags)</div>
            <div class="help-command"><span class="key">?</span> Show/hide this help</div>
          </div>
        </div>

        <div class="help-section">
          <h3>COMMANDS</h3>
          <div class="help-commands">
            <div class="help-command"><span class="key">:help</span> Show help</div>
            <div class="help-command"><span class="key">:sort [type]</span> Sort tasks
              (title|priority|dueDate|created)</div>
            <div class="help-command"><span class="key">:new [title]</span> Create new task</div>
            <div class="help-command"><span class="key">:delete</span> Delete current task</div>
            <div class="help-command"><span class="key">:w</span> Save tasks</div>
            <div class="help-command"><span class="key">:q</span> Quit application</div>
          </div>
        </div>

        <div class="help-section">
          <h3>SCHEDULE COMMANDS</h3>
          <div class="help-commands">
            <div class="help-command"><span class="key">:time</span> Show current task schedule</div>
            <div class="help-command"><span class="key">:schedule</span> Set to today (no args)</div>
            <div class="help-command"><span class="key">:sched 今天</span> Set to today (short form)</div>
            <div class="help-command"><span class="key">:sched 明天</span> Set to tomorrow</div>
            <div class="help-command"><span class="key">:sched 周一</span> Set to this Monday</div>
            <div class="help-command"><span class="key">:sched 每周一</span> Set to every Monday (recurring)</div>
            <div class="help-command"><span class="key">:sched 2025-08-01</span> Set specific date</div>
            <div class="help-command"><span class="key">:sched 2025-08-01 14:30:00</span> Set date & time</div>
            <div class="help-command"><span class="key">:sched clear</span> Clear schedule</div>
            <div class="help-note">Time format: YYYY-MM-DD HH:MM:SS</div>
            <div class="help-note">Supports: 周一~周日, 星期一~星期日, Monday~Sunday</div>
            <div class="help-note">:sched is short for :schedule</div>
          </div>
        </div>

        <div class="help-section">
          <h3>CONTENT NAVIGATION MODE</h3>
          <div class="help-commands">
            <div class="help-command"><span class="key">h/j/k/l</span> Move cursor in content</div>
            <div class="help-command"><span class="key">i</span> Insert at cursor position</div>
            <div class="help-command"><span class="key">ESC</span> Return to normal mode</div>
          </div>
        </div>

        <div class="help-section">
          <h3>INSERT MODE</h3>
          <div class="help-commands">
            <div class="help-command"><span class="key">ESC</span> Return to normal mode</div>
            <div class="help-command"><span class="key">Enter</span> Save and exit (title editing)</div>
          </div>
        </div>

        <div class="help-section">
          <h3>CONFIG MODE</h3>
          <div class="help-commands">
            <div class="help-command"><span class="key">j/k</span> Navigate between sections</div>
            <div class="help-command"><span class="key">Enter</span> Edit selected section</div>
            <div class="help-command"><span class="key">ESC</span> Exit editing or close config</div>
          </div>
        </div>
      </div>
      <div class="help-footer">
        <span class="key-hint">j/k</span> scroll • <span class="key-hint">gg/G</span> top/bottom
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean;
}

defineProps<Props>();
defineEmits<{
  'close': [];
}>();
</script>

<style scoped>
.help-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
  padding-top: 20px;
}

.help-panel {
  background: #1e1e20;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  max-width: 800px;
  max-height: 85vh;
  width: 90%;
  display: flex;
  flex-direction: column;
  border: 1px solid #3e3e42;
}

.help-header {
  padding: 16px 20px;
  border-bottom: 1px solid #3e3e42;
  background: #2e2e32;
  border-radius: 8px 8px 0 0;
}

.help-header h2 {
  margin: 0;
  color: #e6e6e6;
  font-size: 18px;
  font-weight: 600;
}

.help-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
  min-height: 0;
}

.help-section {
  margin-bottom: 16px;
}

.help-section:last-child {
  margin-bottom: 0;
}

.help-section h3 {
  color: #0969da;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.help-commands {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.help-command {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #d4d4d4;
  padding: 2px 0;
}

.help-note {
  font-size: 10px;
  color: #6e7681;
  font-style: italic;
  margin-top: 4px;
  padding-left: 8px;
}

.key {
  background: #3e3e42;
  color: #e6e6e6;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  margin-right: 8px;
  min-width: fit-content;
  text-align: center;
}

.help-footer {
  padding: 8px 20px;
  border-top: 1px solid #3e3e42;
  background: #2a2a2e;
  color: #6e7681;
  font-size: 10px;
  border-radius: 0 0 8px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.key-hint {
  background: #3e3e42;
  color: #e6e6e6;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 9px;
  font-weight: 500;
}

/* 滚动条样式 */
.help-content::-webkit-scrollbar {
  width: 6px;
}

.help-content::-webkit-scrollbar-track {
  background: #2e2e32;
}

.help-content::-webkit-scrollbar-thumb {
  background: #4e4e52;
  border-radius: 3px;
}

.help-content::-webkit-scrollbar-thumb:hover {
  background: #5e5e62;
}
</style>