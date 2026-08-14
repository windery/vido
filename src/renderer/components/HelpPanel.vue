<template>
  <div v-if="visible" class="help-overlay">
    <div class="help-panel">
      <div class="help-head">
        <h2>{{ t('help.title') }}</h2>
      </div>
      <div class="help-body">
        <div v-for="section in sections" :key="section.title" class="help-section">
          <h3>{{ section.title }}</h3>
          <div class="help-grid">
            <div v-for="cmd in section.commands" :key="cmd.key" class="help-row">
              <kbd>{{ cmd.key }}</kbd><span class="desc">{{ cmd.desc }}</span>
            </div>
          </div>
          <div v-for="note in section.notes" :key="note" class="help-note">{{ note }}</div>
        </div>
      </div>
      <div class="help-foot">
        <kbd>j</kbd><kbd>k</kbd> {{ t('help.footScroll') }} · <kbd>gg</kbd>/<kbd>G</kbd> {{ t('help.footNav') }} · <kbd>Esc</kbd> {{ t('help.footClose') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { t, helpSections } from '../i18n';

interface Props {
  visible: boolean;
}

const props = defineProps<Props>();

const sections = computed(() => props.visible ? helpSections() : []);
</script>

<style scoped>
.help-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  z-index: 100;
  display: flex;
  justify-content: center;
  padding: 6vh 16px 0;
}

.help-panel {
  width: min(760px, 94vw);
  height: 86vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: 0 8px 32px var(--shadow);
  overflow: hidden;
  animation: helpIn 0.15s var(--ease);
}

@keyframes helpIn {
  from { opacity: 0; transform: translateY(16px) scale(0.985); }
  to { opacity: 1; transform: none; }
}

.help-head {
  padding: 14px 22px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.help-head h2 {
  margin: 0;
  font-size: 16px;
  color: var(--md-heading);
  font-family: var(--ui);
  font-weight: 600;
}

.help-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 22px 22px;
}

.help-section {
  margin-bottom: 18px;
}

.help-section h3 {
  margin: 0 0 7px;
  font-family: var(--ui);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-bright);
}

.help-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1px 14px;
}

.help-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 2.5px 0;
  font-size: 12px;
  color: var(--text-2);
  font-family: var(--ui);
}

.help-row kbd {
  font-family: var(--mono);
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--surface-3);
  color: var(--text);
  border: 1px solid var(--border);
  white-space: nowrap;
}

.help-row .desc {
  flex: 1;
}

.help-note {
  font-size: 11px;
  color: var(--text-3);
  font-style: italic;
  margin: 3px 0 0 26px;
  font-family: var(--ui);
}

.help-foot {
  padding: 8px 22px;
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: var(--text-3);
  font-family: var(--ui);
}

.help-foot kbd {
  font-family: var(--mono);
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--surface-3);
  border: 1px solid var(--border);
}

@media (max-width: 820px) {
  .help-panel {
    width: 96vw;
    height: 92vh;
  }
  .help-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 400px) {
  .help-head { padding: 12px 14px; }
  .help-body { padding: 12px 14px 18px; }
  .help-foot { padding: 8px 14px; }
}
</style>
