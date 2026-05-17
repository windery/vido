# Vido 配置面板重构 & 交互哲学固化

日期: 2026-05-17

---

## 1. 操作哲学（写入 CLAUDE.md）

```
Vim 是操作范式，不是视觉风格。

键盘模式（COMMAND / INSERT / VISUAL）、快捷键序列（dd / yy / gg / G）、
数字前缀（3j / 2dd）是 vim 的灵魂。

视觉呈现应该现代、精致、符合桌面应用审美。
不追求"看起来像终端 vim"，追求"用起来像 vim 一样高效"。
```

- **操作层**: vim 范式——模式切换、键盘优先、序列操作、零鼠标
- **视觉层**: 现代桌面应用——精致排版、流畅动画、深度阴影、色彩层次

---

## 2. 配置面板：原地展开，不弹 overlay

### 当前问题
`cc` 弹出一个 modal overlay，覆盖整个任务列表。用户从"浏览任务"的心流中跳出来，进入完全不同的交互上下文。

### 新设计
选中任务行**原地展开**，配置区域从任务行下方滑出，下方任务平滑下推。

```
按 cc 前:                    按 cc 后:
┌────────────────────┐       ┌──────────────────────────┐
│ ○ P2 需求已完成     │ ←选中  │ ○ P2 需求已完成            │
│ ○ P3 修 bug        │       │ ┌────────────────────────┐ │
│ ○ P1 重构          │       │ │ 📅日程 │ ⚡优先级 │ 🏷标签 │ │ ← tab 行
│                    │       │ │ ⚡今天  ➡️明天  📌下周 🗑 │ │ ← 快捷选项
│                    │       │ │ 按 1-4 选择  h/l 切 tab │ │ ← 提示
│                    │       │ └────────────────────────┘ │
│                    │       │ ○ P3 修 bug               │
│                    │       │ ○ P1 重构                 │
└────────────────────┘       └──────────────────────────┘
```

### 交互细节
- **动画**: 配置区域 `max-height` 从 0 → auto，`opacity` 0 → 1，transition 200ms ease-out
- **下方任务**: 随配置区域展开平滑下推（`transform: translateY` 或 flex 布局自然流动）
- **收起**: `Esc` 或再次 `cc`，反向动画 150ms ease-in
- **选中高亮**: 展开时任务行保持选中态（蓝色背景），配置区域与任务行无缝连接（无缝隙、同色系过渡）

### 键盘操作
| 键 | 操作 |
|----|------|
| `h/l` | 切换 tab（日程 / 优先级 / 标签） |
| `1-4` | 在日程 tab 直接选中对应快捷选项 |
| `Enter` | 进入当前 tab 的编辑模式 |
| `Esc` | 退出编辑模式，再按收起配置面板 |
| `j/k` | 在选项间移动（收起时不响应，防止和任务列表导航冲突） |

---

## 3. Schedule 操作：2 路径替代 4 tab

### 当前: 4 个独立 tab
`快速选择` | `具体时间` | `星期` | `时间范围`

### 新设计: 2 路径

**路径 1: 快捷选择面板**（默认显示）
```
⚡今天  ➡️明天  📌下周  📆自定义  🗑清除
 1       2       3       4       5
```

- `1-5` 数字键直接选
- `j/k` 方向键移动高亮，`Enter` 确认
- "自定义"打开一个内联输入框

**路径 2: 智能输入框**（按 `4` 或 `/` 进入）
```
┌─────────────────────────────────┐
│ > 2026-05-20 14:30              │
│ 解析结果: 2026年5月20日 14:30   │
└─────────────────────────────────┘
```

- 输入实时解析（复用 `parseScheduleFromString`）
- 支持格式: `today` / `明天` / `周一` / `每周一` / `2026-05-20` / `2026-05-20 14:30` / `14:30-17:30`
- 解析成功显示绿色预览，失败显示红色提示
- `Enter` 确认并收起，`Esc` 取消

---

## 4. 实现简化: 6 层 → 2 层

### 当前架构
```
TaskConfig.vue (380 行)
  ├── ScheduleConfig.vue (380 行)
  │     ├── QuickOptionsTab.vue
  │     ├── DateInputTab.vue (480 行)
  │     ├── WeeklyOptionsTab.vue
  │     └── RangeInputTab.vue
  ├── PriorityConfig.vue
  └── TagsConfig.vue
```
每个子组件都 `defineExpose({ handleKeydown })`，父组件 `ref` 获取后链式委派键盘事件。6 层嵌套，约 1500 行。

### 新架构
```
TaskItem.vue (展开状态集成)
  └── ConfigPanel.vue (200 行)
        ├── SchedulePanel.vue (250 行，含快捷选择 + 智能输入)
        ├── PriorityPanel (内联在 ConfigPanel，30 行)
        └── TagsPanel (内联在 ConfigPanel，40 行)
```

**关键变化:**
1. 配置面板是 `TaskItem.vue` 的展开态，不是独立路由/overlay
2. 不再使用 `defineExpose` + 链式 `handleKeydown`。键盘事件在 `ConfigPanel` 内部 `switch(event.key)` 统一处理，根据 `currentTab` 分发
3. `PriorityPanel` 和 `TagsPanel` 逻辑简单（3 个选项 / 一个输入框），不需要独立组件文件，内联在 `ConfigPanel` 用 `v-if` 切换
4. `SchedulePanel` 用 `v-if` 切换快捷面板和输入框，都在一个文件里

### 键盘事件处理简化

```
ConfigPanel 内部:
  switch(key) {
    case 'h': prevTab(); break;
    case 'l': nextTab(); break;
    case 'j': moveDown(); break;
    case 'k': moveUp(); break;
    case 'Enter': select(); break;
    case 'Escape': deactivate(); break;
    default:
      if (scheduleMode && /[1-5]/.test(key)) quickSelect(key);
  }
```

不再需要 `App.vue → TaskConfig → ScheduleConfig → QuickOptionsTab` 的链式转发。

---

## 5. UI 精致化

### 整体氛围
- **Glassmorphism 点缀**: 配置面板使用半透明背景 `background: rgba(30,30,32,0.85)` + `backdrop-filter: blur(12px)`，让下方任务若隐若现
- **深度层次**: 配置面板 `box-shadow: 0 8px 32px rgba(0,0,0,0.4)` + 微妙的 `border: 1px solid rgba(255,255,255,0.06)`

### 动画
- 配置面板展开: `max-height` 0→200px, `opacity` 0→1, 200ms cubic-bezier(0.16, 1, 0.3, 1)
- 配置面板收起: 反向 150ms cubic-bezier(0.4, 0, 0.2, 1)
- Tab 切换: 内容区左右滑动 150ms（`translateX`，类似 iOS 页面切换）
- 选项 hover: `transform: translateY(-1px)` + `box-shadow` 渐变，100ms
- 选中态: 蓝色左侧边框 `border-left: 3px solid #1976D2` 滑入

### 排版细节
- Tab 标签: `font-size: 11px`, `text-transform: uppercase`, `letter-spacing: 0.5px`, 灰色 `#888`
- 选项卡片: `border-radius: 8px`, `padding: 10px 14px`, 背景 `#2a2a2e`
- 输入框: `border-radius: 6px`, focus 时蓝色内发光 `box-shadow: 0 0 0 2px rgba(25,118,210,0.3)`
- 任务行选中态: 左侧蓝色竖条 + 背景渐变 `#1a3a5c → #264f78`

### 色彩微调
- 主色保持 `#1976D2`，但增加一个更亮的变体 `#42a5f5` 用于 hover/focus
- 完成态文字从 `#6e7681` 改为 `#5a6370`（略柔和）
- 优先级颜色: P1 `#f85149` / P2 `#d29922` / P3 `#58a6ff`（当前 P3 是绿色太跳）

### 字体
- 保持等宽主字体，但 **tab 标签和 hint 文字**改用系统 UI 字体（SF Pro / Segoe UI），层次感更好

---

## 6. 命令行补充

配置面板是视觉入口。命令行（`:`）作为高级用户的快速通道：
- `:p 1` → 设置优先级 P1
- `:p` → 循环切换优先级
- `:t bug fix` → 添加标签
- `:t` → 显示当前标签
- `:sched` 已有，保持

---

## 7. 迁移步骤（概要）

1. 在 `TaskItem.vue` 中添加展开态模板（`v-if="isConfigExpanded"`）
2. 新建 `ConfigPanel.vue`，含 Schedule / Priority / Tags 三个区域
3. 在 `CommandModeHandler` 中修改 `cc`：不再调用 `showTaskConfig()`，而是切换当前任务的 `isConfigExpanded` 状态
4. 实现动画、键盘处理
5. 删除旧组件: `TaskConfig`, `ScheduleConfig`, `PriorityConfig`, `TagsConfig`, `QuickOptionsTab`, `DateInputTab`, `WeeklyOptionsTab`, `RangeInputTab`
6. 清理 `TaskDataManager` 中的 `showTaskConfig`/`exitTaskConfig`/`isTaskConfigVisible`
7. 更新 `App.vue` 移除 `TaskConfig` 引用
8. 更新 `HelpPanel.vue` 中的帮助文本
9. 更新 `CLAUDE.md` 固化操作哲学
