import { defineStore } from 'pinia';

export const lastlineStone = defineStore('lastline', {
  state: () => ({
    mode: 'search',
    content: '',
    history: [] as string[],
    isShown: false,
    inDelay: false,
    focus: false,
    timeoutId: null as ReturnType<typeof setTimeout> | null,
  }),

  actions: {
    show() {
      this.inDelay = false;
      if (this.timeoutId !== null) {
        clearTimeout(this.timeoutId);
      }
      this.isShown = true;
      this.focus = true;
    },
    hide() {
      this.content = '';
      this.inDelay = false;
      if (this.timeoutId !== null) {
        clearTimeout(this.timeoutId);
      }
      this.isShown = false;
      this.focus = false;
    },
    hideWithDelay(delay: number) {
      this.inDelay = true;

      // 如果有之前的timeoutId，清除它
      if (this.timeoutId !== null) {
        clearTimeout(this.timeoutId);
      }

      this.timeoutId = setTimeout(() => {
        this.inDelay = false;
        this.timeoutId = null; // 清空timeoutId
        this.isShown = false;
        this.focus = false;
      }, delay);
    },
    search() {
      this.focus = false;
      this.history.push(this.content);
    },
  },
});
