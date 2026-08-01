/** English dictionary */

import type { HelpSection } from './zh';

export const en: typeof import('./zh').zh = {
  header: {
    title: 'Vido - Vim Todo Manager',
    tasks: '{n} tasks',
    done: '{done}/{total} done',
    themeBtn: 'Toggle theme (T)',
    langBtn: 'Toggle language (L)',
  },
  mode: {
    titleEdit: '-- TITLE EDIT -- (editing task title)',
    contentEdit: '-- INSERT -- (editing task content)',
    contentNav: '-- CONTENT-NAV -- (hjkl to move, i to insert)',
    config: '-- CONFIG -- (cs schedule  cp priority  ct tags  Esc close)',
    help: 'Press ? for help',
    search: '-- SEARCH -- (type your search query)',
    command: '-- COMMAND -- (type vim command)',
    lastLine: '-- LAST-LINE --',
  },
  task: {
    noTitle: '[No title]',
    expired: '(expired)',
  },
  config: {
    schedulePlaceholder: '20260306  or  15:33  or  202603061533',
    today: 'Today',
    tomorrow: 'Tomorrow',
    nextWeek: 'Next week',
    clear: 'Clear',
    custom: 'Custom',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    noTags: 'No tags',
    tagPlaceholder: 'Type a tag, Enter to save',
    add: 'Add',
    footer: '<kbd>j</kbd><kbd>k</kbd> cycle config · <kbd>Esc</kbd> exit',
  },
  content: {
    placeholder: '# Task content (markdown supported)',
    pressI: "Press 'i' to add content",
  },
  msg: {
    quitFallback: 'Quit function available in Electron environment',
  },
  empty: {
    noResults: 'No search results found',
    emptyTitle: 'Empty buffer — start managing your todos',
    emptyKeys: 'Press <kbd>o</kbd> new task · <kbd>/</kbd> search · <kbd>:</kbd> command · <kbd>?</kbd> help',
  },
  status: {
    tasks: 'tasks',
    pos: 'Ln {l}, Col {c}',
  },
  help: {
    title: 'Vido - Vim-style Todo Manager',
    close: 'Press ? or Esc to close',
    footScroll: 'scroll',
    footNav: 'top/bottom',
    sections: [
      {
        title: 'NORMAL MODE',
        commands: [
          { key: 'j/k', desc: 'Navigate up/down' },
          { key: 'Enter', desc: 'Edit task title' },
          { key: 'i', desc: 'Content navigation mode' },
          { key: 'Space', desc: 'Toggle completion' },
          { key: 'o', desc: 'New task below' },
          { key: 'O', desc: 'New task above' },
          { key: 'dd', desc: 'Delete task' },
          { key: 'yy', desc: 'Copy task' },
          { key: 'p', desc: 'Paste task' },
          { key: 'u / Ctrl+R', desc: 'Undo / Redo' },
          { key: 'gg', desc: 'Go to first task' },
          { key: 'G', desc: 'Go to last task' },
          { key: '/', desc: 'Search tasks' },
          { key: 'n / N', desc: 'Next / previous match' },
          { key: ':', desc: 'Enter command mode' },
          { key: 'cc', desc: 'Expand task config inline (schedule/priority/tags)' },
          { key: 'T', desc: 'Toggle theme' },
          { key: 'L', desc: 'Toggle language' },
          { key: '?', desc: 'Show/hide this help' },
        ],
      },
      {
        title: 'COMMANDS',
        commands: [
          { key: ':help', desc: 'Show help' },
          { key: ':clear', desc: 'Clear search and filter' },
          { key: ':sort [type]', desc: 'Sort tasks (title|priority|dueDate|created)' },
          { key: ':new [title]', desc: 'Create new task' },
          { key: ':delete', desc: 'Delete current task' },
          { key: ':w', desc: 'Save tasks' },
          { key: ':q', desc: 'Quit application' },
          { key: ':theme [dark|light]', desc: 'Switch theme' },
          { key: ':lang [zh|en]', desc: 'Switch language' },
        ],
      },
      {
        title: 'SCHEDULE COMMANDS',
        commands: [
          { key: ':time', desc: 'Show current task schedule' },
          { key: ':schedule', desc: 'Set to today (no args)' },
          { key: ':sched today', desc: 'Set to today (short form)' },
          { key: ':sched tomorrow', desc: 'Set to tomorrow' },
          { key: ':sched monday', desc: 'Set to this Monday' },
          { key: ':sched every monday', desc: 'Set to every Monday (recurring)' },
          { key: ':sched 2025-08-01', desc: 'Set specific date' },
          { key: ':sched 2025-08-01 14:30:00', desc: 'Set date & time' },
          { key: ':sched clear', desc: 'Clear schedule' },
        ],
        notes: [
          'Time format: YYYY-MM-DD HH:MM:SS',
          'Supports: 周一~周日, 星期一~星期日, Monday~Sunday',
          ':sched is short for :schedule',
        ],
      },
      {
        title: 'CONTENT NAVIGATION MODE',
        commands: [
          { key: 'h/j/k/l', desc: 'Move cursor in content' },
          { key: 'i', desc: 'Insert at cursor position' },
          { key: 'ESC', desc: 'Return to normal mode' },
        ],
      },
      {
        title: 'INSERT MODE',
        commands: [
          { key: 'ESC', desc: 'Return to normal mode' },
          { key: 'Enter', desc: 'Save and exit (title editing)' },
        ],
      },
      {
        title: 'CONFIG MODE',
        commands: [
          { key: 'j/k', desc: 'Navigate between sections' },
          { key: 'Enter', desc: 'Edit selected section' },
          { key: 'ESC', desc: 'Exit editing or close config' },
        ],
      },
    ] as HelpSection[],
  },
};
