/** English dictionary (single language) */

export interface HelpItem {
  key: string;
  desc: string;
}

export interface HelpSection {
  title: string;
  commands: HelpItem[];
  notes?: string[];
}

export const en = {
  header: {
    done: 'done',
  },
  mode: {
    titleEdit: '-- TITLE EDIT -- (⏎ save · Esc cancel)',
    contentEdit: '-- INSERT -- (Esc back)',
    contentNav: '-- CONTENT-NAV -- (hjkl to move, i to insert)',
    config: '-- CONFIG --',
    // 键位详情在面板 footer/输入框 placeholder 展示，状态栏只报 section 名（徽标），不重复提示
    configScheduleEdit: '⏎ save · Esc cancel',
    configTagsEdit: '⏎ save · Esc cancel',
    help: 'Press ? for help',
    calendar: '-- CALENDAR --',
    search: '-- SEARCH --',
    command: '-- COMMAND -- (:w save · :q quit · :sort · :schedule · :time · :p · :t · :theme · :clear · :undo)',
    lastLine: '-- LAST-LINE --',
  },
  task: {
    noTitle: '[No title]',
    expired: '(expired)',
  },
  config: {
    schedule: 'Schedule',
    priority: 'Priority',
    tags: 'Tags',
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
    tagDeleteHint: 'd + index + ⏎ to delete',
    tagPlaceholder: 'Type a tag, Enter to save',
    add: 'Add',
    footer: '<kbd>H</kbd><kbd>L</kbd> sections · <kbd>j</kbd><kbd>k</kbd> nav · <kbd>0</kbd><kbd>$</kbd> first/last · <kbd>⏎</kbd> select · <kbd>Esc</kbd> exit<br><kbd>e</kbd>d/w/m/y repeat · <kbd>c</kbd>d/w/m/y clear repeat · <kbd>c</kbd>s/p/t jump section',
  },
  content: {
    placeholder: '# Task content (markdown supported)',
    navHint: 'h j k l move · w b e word · 0 $ line · x X del char · dw dd d$ delete · cw cc change · yw yy copy · p P paste · r replace · ~ case · J join · o O new line · u undo · Esc back',
  },
  lastline: {
    commandPlaceholder: 'type command, Tab to complete · ↑/↓ history',
    searchPlaceholder: 'type search query · ↑/↓ history',
  },
  msg: {
    quitFallback: 'Quit function available in Electron environment',
  },
  status: {
    tasks: 'tasks',
    task: 'task',
    pos: 'Ln {l}, Col {c}',
  },
  flash: {
    saved: 'Saved',
    sorted: 'Sorted: {type}',
    scheduleSet: 'Schedule: {text}',
    scheduleCleared: 'Schedule cleared',
    noSchedule: 'No schedule',
    scheduleExpired: '(expired)',
    prioritySet: 'Priority: {mark}',
    priorityCleared: 'Priority cleared',
    tagsShown: 'Tags: {tags}',
    tagAdded: 'Added tag: #{tag}',
    themeSet: 'Theme: {theme}',
    searchCleared: 'Search cleared',
    noMatch: 'No match',
    unknownCommand: 'Unknown command: {cmd}',
    saveFailed: 'Save failed! Data not written to disk',
    copied: 'Copied: {title}',
    pasted: 'Pasted: {title}',
  },
  help: {
    title: 'Vido - Vim-style Todo Manager',
    footScroll: 'scroll',
    footNav: 'top/bottom',
    footClose: 'close',
    sections: [
      {
        title: 'NORMAL MODE',
        commands: [
          { key: 'j / k', desc: 'Move up / down' },
          { key: 'gg / G', desc: 'First / last task' },
          { key: 'o / O', desc: 'New task below / above' },
          { key: 'Enter', desc: 'Edit title' },
          { key: 'i', desc: 'Edit content (vim keys)' },
          { key: 'Space', desc: 'Toggle completion' },
          { key: 'f', desc: 'Toggle flag' },
          { key: 'dd', desc: 'Delete task' },
          { key: 'yy / p', desc: 'Copy / paste task' },
          { key: 'Tab', desc: 'Indent as subtask' },
          { key: '/', desc: 'Search (n / N next / prev)' },
          { key: 'cc', desc: 'Configure task (schedule · priority · tags)' },
          { key: ':', desc: 'Command (:w save · :q quit)' },
          { key: 'g c', desc: 'Calendar view' },
          { key: 'T', desc: 'Toggle theme' },
          { key: '? / Esc', desc: 'Close help' },
        ],
        notes: ['Secondary keys are hinted in their own views: content editor, config panel, calendar, command line'],
      },
    ] as HelpSection[],
  },
};