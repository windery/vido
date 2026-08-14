# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Philosophy

**This program is designed for programmers, embodying programmer characteristics: rigorous, concise, and efficient. It should align with programmer thinking patterns.**

### Scenario-Driven Design (CRITICAL)

**Think in user scenarios, not isolated features.** Before implementing any interaction, trace the full user flow end-to-end:

1. **Entry**: How does the user enter this mode? (keyboard shortcut, state transition)
2. **Operation**: What actions can they perform? List ALL possible actions.
3. **Exit**: What happens after each action? Where does the user land?
4. **Loop**: Can they chain operations without extra steps? Can they switch between modes?
5. **Edge cases**: Empty state, cancel, error, multi-step operations

**Example — config panel state machine:**
```
每个 config type 有两个子状态：select（快捷选择）和 edit（输入编辑）。**单一拥有者**：select 态由 ConfigKeyHandler 独占；edit 态由配置输入框独占（其 keydown 用 `.stop` 拦截 Enter/Escape 并转回同类型 select 态，命令层不介入）。

schedule:    schedule-select ──Enter──→ schedule-edit ──Enter/Esc──→ schedule-select
priority:    priority-select  (只有 select，1/2/3 直接选，选后留在 priority-select)
tags:        tags-select ──Enter──→ tags-edit ──Enter/Esc──→ tags-select

H/L 在 select 状态间横向切换（同一任务的配置项）:  schedule-select ←→ priority-select ←→ tags-select
j/k 进入 nav 态（焦点锁定当前任务，绝不切换任务）：在选项间移动高亮、不直接生效；Enter 选中高亮项后退出 nav 回 select；Esc 退出 nav 回 select（再 Esc 关面板）
Esc 关闭配置（edit 态先取消回 select，再 Esc 关闭）
```

**面板内前缀键（c = 配置导航 / d = 删除，两个命名空间严格分离，杜绝 cc 开/清歧义）**：
- `c` 导航前缀（600ms 窗口）：`cc` 收起面板（与 normal 模式 `cc` 组成对称开关，**绝不清除**）、`cs/cp/ct` 直达 日程/优先级/标签、`cd/cw/cm/cy` 清除对应 repeat
- `d` 删除前缀：`dd` 清除当前项（日程/优先级/全部标签，schedule/priority 需 600ms 内连按、tags 需 600ms 内连按——慢速 d…d 不触发防误触）
- `e` 重复前缀：`ed/ew/em/ey` 设置每天/每周/每月/每年重复
- `j/k` 进入 **nav 态**（**绝不切任务**）：只在选项间移动高亮、**不直接生效**；`Enter` 选中高亮项（唯一生效路径，schedule 选项含 清除/自定义、priority 含 清除、tags 选项为各标签+Add+Clear）→ 退出 nav 回 select；`Esc` 退出 nav 回 select；不按 j/k 时保留原快捷流（1/2/3 直接选、Enter 打开输入）
- `H/L` 横向切 section（同一任务）；其余未知键一律消费

**tags-select 标签删除**（`d` 前缀操作符，仅 tags-select）：`d` 开启删除待确认 → 数字累加为 1 基序号（标签前显示编号，越界/空则不高亮）→ 目标标签高亮（琥珀虚线框 + `✕` 标记）→ `Enter` 确认删除该标签、`Esc`/非数字键取消（取消后按正常流程继续，如 `H/L` 切 section 放行命令层）；600ms 内连按 `dd` 清空全部标签。删除态离开 tags-select 或切换任务时自动清理。其余 section 的 `d` 一律消费，不落到命令层触发全局删除。

**Rules:**
1. select → Enter → edit（打开输入框）
2. edit → Enter → select（保存，回到同类型的 select）
3. edit → Esc → select（取消，回到同类型的 select，内容不保存）
4. select → H/L → 切换到另一个类型的 select（j/k 只导航高亮、Enter 才选中生效，绝不切任务）
5. 操作完成后不改配置类型——加完标签留在 tags-select，选完优先级留在 priority-select

### Operation Philosophy

**Vim is an interaction paradigm, paired with a Terminal Purist visual language.**

- **Interaction layer**: vim paradigm — modal editing (COMMAND / INSERT / VISUAL), keyboard-first, key sequences (`dd`, `yy`, `gg`, `G`), count prefixes (`3j`, `2dd`), zero mouse dependency
- **Visual layer**: Terminal Purist — phosphor-green accent (`#59d98a` dark / `#1a7f3e` light), mono display type, blinking block caret, uppercase mode badges with letter-spacing, inverted-block selection, ASCII `▰▱` progress bar. Terminal-informed but crisp and modern — never a fake-emulator skin.

### 设计铁律（Design Iron Law）— 古早命令行

**所有视觉决策遵循「程序员极客 / 古早命令行」：单色 CRT 磷光绿 + ANSI 色标、等宽字体、块状光标、ASCII/Unicode 方块符号、对齐的信息列。** 禁止圆润渐变、玻璃拟态、大面积圆角卡片等模板化现代风。符号即语义——能用一个 ASCII/Unicode 符号表达，就绝不用文字。

**信息符号约定（固化，新增符号需先更新此表）**：

| 语义 | 符号 | 颜色 / 令牌 |
|---|---|---|
| 优先级 高/中/低 | `!!!` / `!!` / `!` | ANSI 红 `--p1` / 黄 `--p2` / 绿 `--p3`（**前置紧凑标识（3ch 窄列），未设置不占位、标题紧跟编号；手动设置后才显示符号**；不用 `P1/P2/P3` 文字） |
| 旗标（`f` 切换） | `⚑` | 琥珀 `--flag`，**置于标题行尾**（优先级 → 标题 → ⚑） |
| 标签 | `#tag` chip | 绿 `--tag`，**内容区下方 meta 行**常驻显示（与日程同行） |
| 日程 | `@` + 日期文本 | 灰 `--schedule`，**内容区下方 meta 行**常驻显示（标签同行） |
| 已完成 | 无符号，**样式区分**：标题删除线 + 行变暗 | 灰 `--text-dim` / 透明度 |
| 进度条 | `▰▱` ASCII 块 | 磷光绿 |
| 选中行 | `›` 标记 + 行号高亮 | `--accent` |

### UX Principles

- **Inline over overlay**: avoid modal dialogs; expand and collapse content in place to preserve user's spatial context
- **Keyboard-first, not keyboard-only**: keyboard is primary, but visual cues (hover states, transitions, focus rings) enhance discoverability
- **Progressive disclosure**: show common options immediately, reveal advanced options on demand
- **Immediate feedback (vim-instant)**: cursor movement, navigation, and scrolling are instant with zero animation; all other feedback transitions ≤ 150ms (prefer ≤ 100ms); no decorative delays, ever — vim responds in the same frame you press a key, this app must too

## Environment Setup

### Prerequisites

- **Node.js >= 20** (tested on v22, v24). Use a version manager — **never** install Node via Homebrew (icu4c linking breaks on upgrade).
  ```bash
  # Recommended: fnm (Fast Node Manager)
  curl -fsSL https://fnm.vercel.app/install | bash
  fnm install 22
  fnm use 22
  # Or: nvm, volta — any version manager works
  ```
- **pnpm** — required package manager
  ```bash
  corepack enable && corepack prepare pnpm@latest --activate
  ```

### Quick Start

```bash
git clone <repo-url> && cd vido
pnpm install
pnpm dev          # starts Vite + Electron with HMR
```

### VS Code Debug (F5)

`pnpm dev` gives HMR for rapid iteration. VS Code F5 launches Electron with debugger attached for stepping through code. Both work — use `pnpm dev` for UI work, F5 for logic debugging.

**If F5 fails with `Library not loaded: libicui18n`:** your system Node is from Homebrew and icu4c was upgraded. Fix:
```bash
brew reinstall node        # relinks icu4c
# OR switch to fnm (recommended):
fnm use 22
```

## Development Commands

**Recommended: Use pnpm for better performance**

### Core Commands
- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm lint` / `pnpm lint:fix` - ESLint checking and fixes

### Testing Commands
- `pnpm test` - Run all tests (core + UI)
- `pnpm test:core` - Run core functionality tests only
- `pnpm test:ui` - Run UI component tests only
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report

### Git
- Always use `git add -A` to add new files to tracking

## UI Design Principles (CRITICAL)

**Terminal Purist — programmer-grade Vim aesthetic**

### Core Philosophy
This application embodies **programmer values**: rigorous, concise, efficient. The visual language is *Terminal Purist*: phosphor-green accent, mono display type, modal badges, and inverted-block selection — terminal-informed, but rendered crisp and modern, never a fake-emulator skin.

### Design Standards

**Typography & Colors**:
- **Content font**: Monospace (SF Mono, JetBrains Mono, Fira Code) for task data
- **UI font**: System UI (SF Pro / PingFang SC) for labels, hints, badges
- **Accent (dark)**: `#59d98a` phosphor green, bright `#8af0ab`, dim `rgba(89,217,138,.14)`, contrast text `#062b11`
- **Accent (light)**: `#1a7f3e`, bright `#145c2d`, dim `rgba(26,127,62,.12)`, contrast text `#ffffff`
- **Surface (dark)**: `#121212` base, `#1e1e20` panels, `#2a2a2e` inputs
- **Text (dark)**: `#E1E1E1` primary, `#A0A0A0` secondary, `#888` hints
- **Selected row**: green `--active-grad` (`#143623 → #1c4a2e` dark), `›` marker, line number `--ln-selected`
- **Priority marks**: `!!!` `#f85149`（高）、`!!` `#d29922`（中）、`!` `#3fb950`（低）— ANSI 红/黄/绿，不用 `P1/P2/P3` 文字；**默认空，手动设置后才显示**；旗标 `⚑` `--flag` 琥珀色，置于行尾
- **Mode badges**: uppercase labels + `letter-spacing:.06em`, colored text via `--mode-*` tokens (normal blue, insert green, lastline orange)

**Spacing & Layout**:
- **8dp Grid System**: All spacing multiples of 8px (8px, 16px, 24px, 32px)
- **Border Radius**: 4px small, 6-8px cards/panels, header logo 5px
- **Minimum Touch**: 44dp for interactive elements

**Animation & Motion**:
- **Content area**: 零动画 —— 仅当选中的任务有内容时才展示，瞬时出现/消失（无 transition）
- **Expand/collapse (其他面板)**: 200ms cubic-bezier(0.16, 1, 0.3, 1), max-height + opacity
- **Hover/active**: background/border transition, `:active` 1px translateY press-down
- **Focus ring**: green outline `2px var(--accent)` via `:focus-visible`
- **Progress**: ASCII `▰▱` block bar + `done/total` count in header

## DDD Architecture Rules (CRITICAL)

**Bounded contexts MUST be separated.** Each composable/file belongs to exactly one context:
- `domain/entities/` — data objects (Task, TaskList, Schedule)
- `domain/operations/` — pure functions: `(data, ...args) => data`
- `domain/manager/` — composes operations, mutable state holder
- `domain/state/` — reactive store (editor mode + UI state)
- `composables/use-task-list.ts` — task data getters ONLY
- `composables/use-task-state-getters.ts` — editor/UI state getters ONLY

**❌ DO NOT:**
- Put editor state (`lastlineContent`, `editorMode`) in task getters
- Put task filtering logic in Vue composables (belongs on TaskList entity)
- Create pass-through composables that just wrap `store.xxx()`
- Mix task/editor/UI concerns in a single file

**✅ DO:**
- `TaskList.all` for filtered tasks, `TaskList.isSearching` for search state
- `store.state.editorMode` for editor mode, `store.state.lastlineContent` for command input
- Composables read `store.manager.list` (tasks) and `store.state` (editor) separately
- Domain operations accept `TaskList` as parameter, return new `TaskList`

**Interaction Principles**:
- **Keyboard-first**: All interactions keyboard accessible, visual cues enhance discoverability
- **Inline over overlay**: No modal dialogs; expand in place
- **Immediate feedback (vim-instant)**: cursor movement, navigation, and scrolling are instant with zero animation; all other feedback transitions ≤ 150ms (prefer ≤ 100ms); no decorative delays, ever — vim responds in the same frame you press a key, this app must too
- **Progressive disclosure**: Common options visible; advanced behind input/custom
- **4.5:1 contrast ratio** minimum for all text
- **Clear action**: `dd` 在配置面板内清除当前项（`d` 是 vim 删除前缀：`dd` 清当前项、tags 里 `d+序号+Enter` 删单个标签）；面板内 `cc` 只收起面板（与 normal 模式 `cc` 组成开关），**开/清键位绝不复用**。Never use numeric keys for destructive actions.

**Visual Design (CRITICAL)**:
- **Premium, minimal, unified** — every element must feel like part of one cohesive design system. No "stuck on" looking panels.
- **Pill buttons** for option groups — rounded, subtle background, keyboard shortcut badge inside `<kbd>`
- **Color coding** only where semantic (priority red/yellow/green ANSI, flag amber, schedule blue accent)
- **Panel background**: `rgba(255,255,255,0.02)` with `rgba(255,255,255,0.05)` border — barely visible, lets content breathe
- **Typography**: UI labels in system font (SF Pro), content in monospace. Never mix within the same element.
- **Spacing**: 8px grid, generous padding. No cramped layouts.
- **Hover/active states**: subtle `rgba(255,255,255,0.04 → 0.08)` background transition, never `transform: translateY` for config items
- **Footer bar**: thin top border, muted text, keyboard hints. Consistent across all config tabs.

### Implementation Requirements
- Every UI change must enhance productivity and reduce cognitive load
- Test all interfaces in dark mode first (primary use case)
- Design for extended usage (reduce eye strain, optimize for flow state)

## Architecture

```
domain/
  entities/    Task, TaskList, Schedule     ← data objects
  operations/  纯函数 (data, args) => data   ← no side effects
  manager/     TaskListManager              ← composes operations
  state/       Store (reactive singleton)   ← editor mode + UI state
  keyboard/    Mode handlers                ← key dispatch

composables/
  use-task-list.ts         ← task data getters ONLY
  use-task-state-getters.ts ← editor/UI state ONLY
  use-task-state.ts        ← unified entry
```

**Data flow:** `keyboard → Store.transition() → afterChange() → Vue ref → re-render`

**State:** `Store.state` is reactive (editorMode, lastline, help). `Store.manager` holds TaskListManager (list + operations).

**Imports:** `import { store } from '../domain/state/store'` for domain access. `import { useTaskState } from '../composables/use-task-state'` for Vue components.

**持久化（桌面应用原则：数据与配置一律落盘）**: 任务数据 `tasks.json` 与偏好 `prefs.json`（主题等）都经 IPC 落盘到 `<root>/data/`；dev 环境根目录为 `~/.vido-dev`、生产为 `~/.vido`（环境隔离，唯一来源 `src/main/paths.ts`）。渲染进程不得直接用 localStorage 存偏好——旧版 `vido.prefs.v1` 值在首次启动时自动迁移到磁盘。

## Testing System

### API-Driven Testing (Primary Method)

**System Architecture**:
- `src/utils/test-client.ts` - Frontend receives/simulates keyboard events
- API server receives HTTP commands, forwards to frontend
- All interactions logged to `~/.vido-dev/log/vido-YYYY-MM-DD.log`（测试/开发环境；生产为 `~/.vido/log/`，见 `src/main/paths.ts` 环境隔离）
- Behavior verified through log analysis

**Starting Test Environment**:
```bash
# Terminal 1: Start API server
node api-server.cjs

# Terminal 2: Start dev server  
pnpm dev

# Browser: Open http://localhost:5174
```

**API Testing Interface**:
```bash
# Individual keys
curl -X POST http://localhost:3002/api/key/j
curl -X POST http://localhost:3002/api/key/k

# Key sequences
curl -X POST http://localhost:3002/api/sequence \
  -H "Content-Type: application/json" \
  -d '{"keys": ["j", "k", "i", "Escape"]}'
```

**Claude Code Testing Process (MANDATORY)**:
1. **Trigger**: Send API commands for keyboard operations
2. **Check Logs**: `tail -30 ~/.vido-dev/log/vido-$(date +%Y-%m-%d).log`
3. **Analyze**: Verify keyboard manager, events, state transitions
4. **Fix**: Address issues based on log analysis

### TDD Testing (Secondary Method)

**Test Structure**:
- `src/renderer/domain/__tests__/` - Core logic unit tests
- `src/renderer/components/__tests__/` - UI component tests
- `src/renderer/i18n/__tests__/` - i18n dictionary tests
- `src/renderer/utils/__tests__/` - logger / schedule-helper pure-function tests
- `src/main/__tests__/` - Main-process logger pure-function tests (`// @vitest-environment node`)
- **Framework**: Vitest + Vue Test Utils + jsdom

**Testing Workflow**:
1. Run `pnpm test` before changes (baseline)
2. Use `pnpm test:watch` during development
3. Run relevant test suite after each change
4. Full test suite + typecheck before commit
5. `pnpm test:coverage` for coverage report (needs `@vitest/coverage-v8`)

## Logging and Debugging

### Critical Rule: Use Project Logger

**❌ Wrong**: `console.log('[KeyboardManager] action')`  
**✅ Right**: `logger.info('KeyboardManager', 'action')`

```typescript
import { logger } from './utils/logger';

logger.info('ComponentName', 'action description');
logger.warn('ComponentName', 'warning message');
logger.error('ComponentName', 'error message', { error: errorObject });
```

### Log Format (v2, CRITICAL)

**Single line**: `[ts] [LEVEL] [Module] message | key=value`

```
[2026-08-01T12:00:00.000Z] [INFO] [Store] create task | id=5 | title="买牛奶" | selected=true
```

- **Timestamp**: ISO 8601 (`new Date().toISOString()`)
- **data 扁平化**: `Object.entries(data).map(([k, v]) => \`${k}=${JSON.stringify(v)}\`)`，键值对之间用 ` | ` 连接；无 data 时不输出 ` | ` 后缀
- **格式唯一来源**: 渲染进程 `src/renderer/utils/logger.ts` 与主进程 `src/main/logger.ts` 各有一份同构纯函数 `formatLogEntry(level, module, message, data?)`，禁止另写格式

### Log Levels (v2, CRITICAL)

| 级别 | 用途 |
|---|---|
| ERROR | 失败 / 异常（保存失败、加载失败、未知模式等） |
| WARN | 可恢复异常（任务不存在、无效参数、非法优先级） |
| INFO | **数据变更** + 关键事件（启动、模式切换、命令执行、保存/加载） |
| DEBUG | 高频导航、光标、DOM 细节（默认不输出） |

- **级别过滤**: 渲染进程 `import.meta.env.VITE_LOG_LEVEL`，主进程 `process.env.VIDO_LOG_LEVEL`，均默认 `'INFO'`；`shouldLog(level)` 为纯函数
- **DevTools 默认关闭**；调试时 `VIDO_DEVTOOLS=1 pnpm dev` 再打开

### Data Mutation Logging (v2, CRITICAL)

**数据变更日志集中在 Store 层**（`src/renderer/domain/state/store.ts`，单一事实来源，handler 不重复打）。每条数据变更在变更后记录 `logger.info('Store', '<action>', { details })`：

| 操作 | message | data |
|---|---|---|
| createNewTask | `create task` | `id, title` |
| deleteSelectedTask | `delete task` | `id, title` |
| toggleTaskCompletion | `toggle complete` | `id, completed` |
| toggleFlag | `toggle flag` | `id, flagged` |
| updateTaskProperty | `update task` | `id, field, value` |
| pasteTask | `paste task` | `newId, fromId` |
| sortTasks | `sort tasks` | `type, count` |
| insertNewLineBelow | `insert line` | `taskId, line` |
| undo / redo | `undo` / `redo` | `step, total, tasks` |
| applySearch | `search` | `term, matches, selectedId` |
| clearSearch | `clear search` | — |
| save | `save` | `tasks, file` |

**自动保存（防抖 800ms）**: 数据变更（create/delete/toggle/flag/update/paste/sort/undo/redo/insert line）后经 `Store.scheduleSave()` 防抖 800ms 自动保存到 `tasks.json`，连续操作合并为一次写盘；手动 `:w` 立即保存仍保留。高频导航/光标移动不触发保存。**规则：任何数据变更路径都必须调用 `scheduleSave()`，否则刷新/重启会丢失。**

**去冗余规则**: 高频导航（`selectTask`/`selectNext`/光标更新/DOM 聚焦/按键细节/IME 起止/ref sync）一律降为 DEBUG 或删除，不占用 INFO 噪音。导航选择在 `TaskListManager` 层记录（DEBUG），不重复打。

### Critical Rule: Log-First + Automated Debugging

**Never ask the user to manually reproduce a bug. Use the test API to simulate operations and verify via logs.**

**测试一律后台执行，不弹窗、不抢焦点、不打断用户工作**。用 `VIDO_BACKGROUND=1` 启动，窗口保持隐藏，一切状态通过日志观察。如果日志不足以判断运行情况，**先补日志再测**，而不是弹窗肉眼看。

#### Automated Debugging Workflow

```bash
# 1. Kill existing instances (user's VS Code F5 or previous runs), then start dev server in BACKGROUND
pkill -f "node_modules/.pnpm/electron" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 1
VIDO_BACKGROUND=1 pnpm dev > /tmp/vido-dev.log 2>&1 &

# 2. Wait for test API
until curl -s --noproxy '*' http://localhost:3002/api/health | grep -q ok; do sleep 2; done

# 3. Simulate key sequences
curl -s --noproxy '*' -X POST http://localhost:3002/api/sequence \
  -H "Content-Type: application/json" \
  -d '{"keys": ["i", "l", "a", "x"]}'

# 4. Verify via logs (add logger calls first if missing)
tail -50 ~/.vido-dev/log/vido-$(date +%Y-%m-%d).log | grep "TagName"
```

**注意**: 编辑 `src/main/**` 会触发 vite-plugin-electron 重启 Electron。后台测试要重启时，用上面的 `pkill` 清掉旧实例再起，避免残留窗口抢焦点。

#### Log Analysis Priority

1. **Read logs FIRST** — `tail -100 ~/.vido-dev/log/vido-$(date +%Y-%m-%d).log`
2. **If insufficient, ADD logs with key state values**, rebuild, then use test API to reproduce
3. **Analyze logs to pinpoint the exact line/value**, then fix
4. **After fixing, use test API to verify**, then check logs to confirm

Every **data mutation** (create/delete/toggle/update/paste/sort/undo/redo/search/save) MUST produce a `[Store]` INFO log (see table above). State transitions and mode switches are logged at INFO. High-frequency selection/cursor/DOM detail goes to DEBUG. If a data mutation path isn't logged, add the log before debugging further.

### Log Analysis

**Location**: dev/测试 `~/.vido-dev/log/vido-YYYY-MM-DD.log`；生产 `~/.vido/log/vido-YYYY-MM-DD.log`（环境隔离，见 `src/main/paths.ts`）

**Analysis Commands**:
```bash
# Real-time logs
tail -f ~/.vido-dev/log/vido-$(date +%Y-%m-%d).log

# Recent entries
tail -50 ~/.vido-dev/log/vido-$(date +%Y-%m-%d).log

# Search events
grep -E "(KeyboardManager|State transition)" ~/.vido-dev/log/vido-$(date +%Y-%m-%d).log
```

**Log Contents**:
- Keyboard events captured by KeyboardManager
- State transitions and mode switches
- Navigation operations and cursor movement
- API events from TestClient

### Debugging Workflow

**Standard Process**:
1. **Check logs first** - Examine log files before investigating code
2. **Manual operation** - Test functionality by pressing keys in app
3. **Log analysis** - Use logs to locate problem areas
4. **Verify fixes** - Test again and check logs after changes

**Claude Code Guidelines**:
- Always check logs first when investigating issues
- Use log analysis to understand system behavior
- Verify fixes before presenting solutions
- Ensure solutions work through systematic testing

## Development Notes

### Key Patterns
- **Editor State Driven**: Check current mode, route to appropriate logic
- **Entity State Awareness**: Use current task, cursor position for handling
- **Unified Event Entry**: All keys through KeyboardManager.handleKeyEvent
- **Mode-Specific Logic**: Each EditorMode has dedicated methods
- **Focus Management**: Precise handling for vim-like behavior
- **Vim Conventions**: Standard bindings (`hjkl`, `dd`, `yy`, `gg`, `G`)

### File Structure
- `src/domain/entities/` - Data objects (Task, TaskList, Schedule)
- `src/domain/operations/` - Pure functions (task-crud, task-persistence)
- `src/domain/manager/` - TaskListManager (composes operations)
- `src/domain/state/` - Store (reactive singleton)
- `src/domain/keyboard/` - Mode handlers (command, content-nav, etc.)
- `src/components/` - Vue components
- `src/composables/` - Vue reactive bindings (use-task-list, use-task-state-getters)
- `src/utils/` - logger, date-formatter, test-client

### Development Requirements
- **DDD boundaries** - Each file belongs to ONE bounded context (task / editor / UI)
- **Log-first debugging** - Always check `~/.vido-dev/log/`（dev/测试）before reading code；生产为 `~/.vido/log/`
- **Automated testing** - Use `curl` to port 3002 for key simulation, then verify logs
- **Keyboard-first** - All interactions keyboard accessible, no mouse
- **Immutable data** - Domain operations return new objects, never mutate in place

## Agent skills

### Issue tracker

Issues and PRDs live as GitHub issues; use the `gh` CLI for all operations. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.