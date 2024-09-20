import { defineStore } from 'pinia';
import { EditorMode } from '../domain/editor';

export const editorStore = defineStore('editor-mode', {
  state: () => ({
    mode: EditorMode.COMMAND,
  }),

  actions: {
    changeMode(mode: EditorMode) {
      this.mode = mode;
    },
  },
});
