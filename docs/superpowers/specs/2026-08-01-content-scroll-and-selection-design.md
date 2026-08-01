# 内容区滚动跟随光标 + 选中任务强化显示 — 设计

日期：2026-08-01
状态：已批准（用户确认「同意」）

## 背景与问题

用户报告：任务内容很多（如 100 行）时，在内容导航模式下向下移动光标，内容不会跟着滚动，导致信息展示不全。

代码定位的根源（Vue 实现，`src/renderer/components/TaskContent.vue`）：

- `.task-content-area` 设了 `max-height: 500px; overflow: hidden`（109-110 行）→ 超长内容被容器裁剪，无滚动。
- `.content-editor` 设了 `overflow: hidden` 且高度由 JS 自适应为 `scrollHeight`（`adjustHeight`）→ textarea 高度等于内容高度，textarea 内部不存在滚动容器，无法跟随光标滚动。

设计源 `vido.html` 用的是「完全展开」策略（`.content-area` 无 max-height，列表容器滚动保证选中任务可见）。用户希望保留「有限展开 + 超高超滚动 + 光标即时跟随」，不完全对齐设计源的无限展开。

## 目标

1. 选中当前任务时，通过明暗 + 光晕强化显示，让当前选中行与展开内容成为视觉焦点。
2. 适当拓宽选中任务内容区的展示高度；内容超高时内容区内部滚动，且滚动随光标位置变化即时生效（零动画，vim 语义）。
3. 将「vim 即时响应，动画不得存在长时长」固化进项目规则。

## 设计决策

### A. 选中任务强化显示（明暗 + 光晕，纯 CSS）

- **选中任务行**（`.task-line.selected`）：
  - 提亮渐变背景（微调 `--bg-selected` 或叠加高亮层）。
  - 叠加 accent 色柔和光晕：`box-shadow: 0 0 0 1px rgba(var(--accent-rgb), .35), 0 0 14px rgba(var(--accent-rgb), .12)`。
  - 文字保持 `--text-bright`，行号 `--ln-selected`（现状已具备）。
- **展开内容区**（`.task-content-area.show`）：
  - 左边框从 3px accent 加粗为 4px 并点亮为 `--accent-bright`。
  - 背景提亮一档（新增或复用令牌）。
  - 细描边 accent 色，让「当前正在阅读的内容」成为焦点。
- **背景模糊**：默认不启用（`backdrop-filter` 在长列表上为持续渲染开销，与 vim 即时响应理念相悖）。如需毛玻璃沉浸感，可后续作为可选档，仅加在选中任务内容区，`blur(2px)` 上限。

### B. 内容高度拓宽 + 光标滚动跟随（关键修复）

- `.task-content-area` 的 `max-height` 由固定 `500px` 改为视口比例 **`60vh`**。
- `.content-editor` 的 `overflow: hidden` 改为 **`overflow-y: auto`**。
- `adjustHeight` 的 JS 高度计算改为 `height = min(scrollHeight, 内容区上限)`，上限与 CSS `60vh` 一致（通过读取同一 CSS 变量或常量）。
- 效果：
  - 内容 ≤ 60vh：textarea 高度=内容高度，紧凑展开，无滚动条。
  - 内容 > 60vh：textarea 固定 60vh 高，内部出现滚动条；`setSelectionRange` 后浏览器原生即时滚动光标到可见区（零动画），编辑模式输入同理。
- 任务切换整体滚动（`scrollToTask`）保持不变，确保选中任务整体可见。

### C. 动画即时性约束（固化到 CLAUDE.md）

将现有「Immediate feedback: 200ms transitions, no decorative delays」强化为 vim 即时响应原则：

> **Vim 即时响应**：导航、光标移动、滚动零动画即时生效；任何交互反馈动画 ≤ 150ms（倾向 100ms 内）；装饰性动画一律禁止长时长；内容区展开/收起 transition 保持 ≤ 150ms。

## 涉及文件

- `src/renderer/components/TaskContent.vue` — `.task-content-area` max-height、`.content-editor` overflow、`adjustHeight`、选中强化样式。
- `src/renderer/components/TodoList.vue` — 如需在导航移动后触发滚动（当前依赖 textarea 原生行为，预计无需改动）。
- `src/renderer/style.css` — 如需新增 `--bg-selected` 高亮层 / accent 光晕色令牌。
- `CLAUDE.md` — 固化 C 节约束。

## 验证计划

- 单测：`computeNavSelection` 已有；高度计算 `min(scrollHeight, maxH)` 若有纯函数部分则补测。
- 真实运行（vite build + 静态服务器 + headless Chrome + CDP）：
  - 造一个 100 行内容的任务，进入内容导航。
  - 断言：textarea `scrollHeight > clientHeight`（超高触发内部滚动）；`scrollTop` 随光标移动（`j`/`G` 到底行）即时变化且光标位于可见区内。
  - 断言：`.task-line.selected` 的 box-shadow 生效。
- typecheck + test + lint 全绿。
