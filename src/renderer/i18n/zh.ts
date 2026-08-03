/** 中文词典 */

export interface HelpItem {
  key: string;
  desc: string;
}

export interface HelpSection {
  title: string;
  commands: HelpItem[];
  notes?: string[];
}

export const zh = {
  header: {
    title: 'Vido - Vim 任务管理器',
    tasks: '{n} 个任务',
    done: '已完成 {done}/{total}',
  },
  mode: {
    titleEdit: '-- TITLE EDIT --（编辑任务标题）',
    contentEdit: '-- INSERT --（编辑任务内容）',
    contentNav: '-- CONTENT-NAV --（hjkl 移动，i 插入）',
    config: '-- CONFIG --（cs 日程  cp 优先级  ct 标签  Esc 关闭）',
    configSchedule: '-- SCHEDULE --（1 今天 2 明天 3 下周 cc 清除 ⏎ 自定义）',
    configScheduleEdit: '-- SCHEDULE-EDIT --（输入日期，Enter 保存，Esc 取消）',
    configPriority: '-- PRIORITY --（1 !!! 高 2 !! 中 3 ! 低）',
    configTags: '-- TAGS --（⏎ 添加 cc 清除）',
    configTagsEdit: '-- TAGS-EDIT --（输入标签，Enter 保存，Esc 取消）',
    help: '按 ? 查看帮助',
    search: '-- SEARCH --（输入搜索关键词）',
    command: '-- COMMAND --（输入 vim 命令）',
    lastLine: '-- LAST-LINE --',
  },
  task: {
    noTitle: '[无标题]',
    expired: '(已过期)',
  },
  config: {
    schedulePlaceholder: '20260306  或  15:33  或  202603061533',
    today: '今天',
    tomorrow: '明天',
    nextWeek: '下周',
    clear: '清除',
    custom: '自定义',
    high: '高',
    medium: '中',
    low: '低',
    noTags: '无标签',
    tagPlaceholder: '输入标签名，Enter 保存',
    add: '添加',
    footer: '<kbd>j</kbd><kbd>k</kbd> 切换配置 · <kbd>Esc</kbd> 退出',
  },
  content: {
    placeholder: '# 任务内容（支持 Markdown）',
  },
  msg: {
    quitFallback: '退出功能仅在 Electron 环境中可用',
  },
  empty: {
    noResults: '未找到搜索结果',
    emptyTitle: '空缓冲区 — 开始管理你的待办',
    emptyKeys: '按 <kbd>o</kbd> 新建任务 · <kbd>/</kbd> 搜索 · <kbd>:</kbd> 命令 · <kbd>?</kbd> 帮助',
  },
  status: {
    tasks: '任务',
    pos: '行 {l} · 列 {c}',
  },
  flash: {
    saved: '已保存',
    sorted: '已排序：{type}',
    scheduleSet: '日程：{text}',
    scheduleCleared: '日程已清除',
    noSchedule: '未设置日程',
    scheduleExpired: '（已过期）',
    prioritySet: '优先级：{mark}',
    priorityCleared: '优先级已清除',
    tagsShown: '标签：{tags}',
    tagAdded: '已添加标签：#{tag}',
    themeSet: '主题：{theme}',
    langSet: '语言：{lang}',
    searchCleared: '已清除搜索',
    unknownCommand: '未知命令：{cmd}',
    saveFailed: '保存失败！数据未写入磁盘',
    copied: '已复制：{title}',
    pasted: '已粘贴：{title}',
  },
  help: {
    title: 'Vido - Vim 任务管理器',
    footScroll: '滚动',
    footNav: '顶部/底部',
    sections: [
      {
        title: '普通模式',
        commands: [
          { key: 'j/k', desc: '上/下移动' },
          { key: 'Enter', desc: '编辑任务标题' },
          { key: 'i', desc: '进入内容导航模式' },
          { key: 'Space', desc: '切换完成状态' },
          { key: 'f', desc: '切换旗标' },
          { key: 'o', desc: '在下方新建任务' },
          { key: 'O', desc: '在上方新建任务' },
          { key: 'dd', desc: '删除任务' },
          { key: 'yy', desc: '复制任务' },
          { key: 'p', desc: '粘贴任务' },
          { key: 'u / Ctrl+R', desc: '撤销 / 重做' },
          { key: 'gg', desc: '跳转到第一个任务' },
          { key: 'G', desc: '跳转到最后一个任务' },
          { key: '/', desc: '搜索任务' },
          { key: 'n / N', desc: '下一个 / 上一个匹配' },
          { key: ':', desc: '进入命令模式' },
          { key: 'cc', desc: '展开任务配置（日程/优先级/标签）' },
          { key: 'T', desc: '切换主题' },
          { key: 'L', desc: '切换语言' },
          { key: '?', desc: '显示/隐藏帮助' },
        ],
      },
      {
        title: '命令',
        commands: [
          { key: ':help', desc: '显示帮助' },
          { key: ':clear', desc: '清除搜索与过滤' },
          { key: ':undo / :redo', desc: '撤销 / 重做' },
          { key: ':sort [type]', desc: '排序任务（title|priority|created|updated|completed）' },
          { key: ':new [title]', desc: '新建任务' },
          { key: ':delete', desc: '删除当前任务' },
          { key: ':p [1|2|3|clear]', desc: '设置优先级（1 高 2 中 3 低）' },
          { key: ':t <tag>', desc: '添加标签' },
          { key: ':w', desc: '保存任务' },
          { key: ':q', desc: '退出应用' },
          { key: ':theme [dark|light]', desc: '切换主题' },
          { key: ':lang [zh|en]', desc: '切换语言' },
          { key: ': 或 / 后按 ↑/↓', desc: '浏览命令/搜索历史' },
        ],
      },
      {
        title: '时间安排命令',
        commands: [
          { key: ':time', desc: '显示当前任务日程' },
          { key: ':schedule', desc: '设为今天（无参数）' },
          { key: ':sched 今天', desc: '设为今天（简写）' },
          { key: ':sched 明天', desc: '设为明天' },
          { key: ':sched 周一', desc: '设为本周一' },
          { key: ':sched 每周一', desc: '设为每周一（循环）' },
          { key: ':sched 2025-08-01', desc: '设定具体日期' },
          { key: ':sched 2025-08-01 14:30:00', desc: '设定日期与时间' },
          { key: ':sched clear', desc: '清除日程' },
        ],
        notes: [
          '时间格式：YYYY-MM-DD HH:MM:SS',
          '支持：周一~周日、星期一~星期日、Monday~Sunday',
          ':sched 是 :schedule 的简写',
        ],
      },
      {
        title: '内容导航模式',
        commands: [
          { key: 'h/j/k/l', desc: '在内容中移动光标' },
          { key: 'w / b / e', desc: '下一个词 / 上一个词 / 词尾' },
          { key: '0 / $', desc: '行首 / 行尾' },
          { key: 'gg / G', desc: '首行 / 末行' },
          { key: 'i', desc: '在光标位置插入' },
          { key: 'a', desc: '在行尾插入' },
          { key: 'o', desc: '在下方插入新行' },
          { key: 'ESC', desc: '返回普通模式' },
        ],
      },
      {
        title: '插入模式',
        commands: [
          { key: 'ESC', desc: '返回普通模式' },
          { key: 'Enter', desc: '保存并退出（标题编辑）' },
        ],
      },
      {
        title: '配置模式',
        commands: [
          { key: 'cs / cp / ct', desc: '直达 日程/优先级/标签' },
          { key: 'j/k', desc: '在配置项之间切换' },
          { key: '1 / 2 / 3', desc: '快捷选择（优先级/日程）' },
          { key: 'cc', desc: '清除（日程/优先级/标签）' },
          { key: 'Enter', desc: '编辑选中项' },
          { key: 'ESC', desc: '退出编辑或关闭配置' },
        ],
      },
    ] as HelpSection[],
  },
};
