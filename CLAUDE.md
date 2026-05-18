# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Philosophy

**This program is designed for programmers, embodying programmer characteristics: rigorous, concise, and efficient. It should align with programmer thinking patterns.**

### Operation Philosophy

**Vim is an interaction paradigm, not a visual style.**

- **Interaction layer**: vim paradigm — modal editing (COMMAND / INSERT / VISUAL), keyboard-first, key sequences (`dd`, `yy`, `gg`, `G`), count prefixes (`3j`, `2dd`), zero mouse dependency
- **Visual layer**: modern desktop application — refined typography, fluid animations, depth shadows, color hierarchy, glassmorphism accents

Do not imitate terminal vim's visual appearance. The UI should feel premium and modern while retaining vim's efficient keyboard-driven operations.

### UX Principles

- **Inline over overlay**: avoid modal dialogs; expand and collapse content in place to preserve user's spatial context
- **Keyboard-first, not keyboard-only**: keyboard is primary, but visual cues (hover states, transitions, focus rings) enhance discoverability
- **Progressive disclosure**: show common options immediately, reveal advanced options on demand
- **Immediate feedback**: 200ms transitions, no decorative delays

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

**Material Design with programmer-friendly aesthetics**

### Core Philosophy
This application embodies **programmer values**: rigorous, concise, efficient. UI should enhance productivity through clean, purposeful design.

### Design Standards

**Typography & Colors**:
- **Content font**: Monospace (SF Mono, JetBrains Mono, Fira Code) for task data
- **UI font**: System UI (SF Pro / Segoe UI) for labels, hints, tab headers
- **Primary**: #1976D2 (Material Blue 700), hover/focus accent #42a5f5
- **Surface**: #121212 base, #1e1e20 cards, #2a2a2e inputs
- **Text**: #E1E1E1 (primary), #A0A0A0 (secondary), #888 (hints)
- **Priority colors**: P1 #f85149, P2 #d29922, P3 #58a6ff
- **Glass surface**: `rgba(30,30,32,0.85)` + `backdrop-filter: blur(12px)` for panels
- **Active**: blue left border + gradient background `#1a3a5c → #264f78`

**Spacing & Layout**:
- **8dp Grid System**: All spacing multiples of 8px (8px, 16px, 24px, 32px)
- **Elevation**: 2dp, 4dp, 8dp, 16dp for different content layers
- **Border Radius**: 4dp (small), 8dp (cards/panels)
- **Minimum Touch**: 44dp for all interactive elements

**Animation & Motion**:
- **Expand/collapse**: 200ms cubic-bezier(0.16, 1, 0.3, 1), max-height + opacity
- **Tab switch**: 150ms translateX slide
- **Hover**: transform translateY(-1px) + box-shadow, 100ms
- **Focus ring**: blue inner glow `box-shadow: 0 0 0 2px rgba(25,118,210,0.3)`
- **Selection**: blue left border slides in, background gradient transition

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
- **Immediate feedback**: 200ms transitions, no decorative delays
- **Progressive disclosure**: Common options visible; advanced behind input/custom
- **4.5:1 contrast ratio** minimum for all text
- **Clear action**: `c` key = clear/remove (schedule clear, tags clear). Never use numeric keys for destructive actions.

**Visual Design (CRITICAL)**:
- **Premium, minimal, unified** — every element must feel like part of one cohesive design system. No "stuck on" looking panels.
- **Pill buttons** for option groups — rounded, subtle background, keyboard shortcut badge inside `<kbd>`
- **Color coding** only where semantic (priority red/yellow/blue, schedule blue accent)
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

## Testing System

### API-Driven Testing (Primary Method)

**System Architecture**:
- `src/utils/test-client.ts` - Frontend receives/simulates keyboard events
- API server receives HTTP commands, forwards to frontend
- All interactions logged to `~/.vido/log/vido-YYYY-MM-DD.log`
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
2. **Check Logs**: `tail -30 ~/.vido/log/vido-$(date +%Y-%m-%d).log`
3. **Analyze**: Verify keyboard manager, events, state transitions
4. **Fix**: Address issues based on log analysis

### TDD Testing (Secondary Method)

**Test Structure**:
- `src/domain/__tests__/` - Core logic unit tests
- `src/components/__tests__/` - UI component tests  
- `src/test/integration/` - End-to-end workflows
- **Framework**: Vitest + Vue Test Utils + jsdom

**Testing Workflow**:
1. Run `pnpm test` before changes (baseline)
2. Use `pnpm test:watch` during development
3. Run relevant test suite after each change
4. Full test suite + typecheck before commit

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

### Critical Rule: Log-First + Automated Debugging

**Never ask the user to manually reproduce a bug. Use the test API to simulate operations and verify via logs.**

#### Automated Debugging Workflow

```bash
# 1. Kill existing instances (user's VS Code F5 or previous runs), then start dev server
pkill -f "Electron.*vido" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 1
pnpm dev > /tmp/vido-dev.log 2>&1 &

# 2. Wait for test API
until curl -s --noproxy '*' http://localhost:3002/api/health | grep -q ok; do sleep 2; done

# 3. Simulate key sequences
curl -s --noproxy '*' -X POST http://localhost:3002/api/sequence \
  -H "Content-Type: application/json" \
  -d '{"keys": ["i", "l", "a", "x"]}'

# 4. Verify via logs (add logger calls first if missing)
tail -50 ~/.vido/log/vido-$(date +%Y-%m-%d).log | grep "TagName"
```

#### Log Analysis Priority

1. **Read logs FIRST** — `tail -100 ~/.vido/log/vido-$(date +%Y-%m-%d).log`
2. **If insufficient, ADD logs with key state values**, rebuild, then use test API to reproduce
3. **Analyze logs to pinpoint the exact line/value**, then fix
4. **After fixing, use test API to verify**, then check logs to confirm

Every state change (mode transition, task selection, cursor position, config toggle) MUST be logged. If a code path isn't logged, add the log before debugging further.

### Log Analysis

**Location**: `~/.vido/log/vido-YYYY-MM-DD.log`

**Analysis Commands**:
```bash
# Real-time logs
tail -f ~/.vido/log/vido-$(date +%Y-%m-%d).log

# Recent entries
tail -50 ~/.vido/log/vido-$(date +%Y-%m-%d).log

# Search events
grep -E "(KeyboardManager|State transition)" ~/.vido/log/vido-$(date +%Y-%m-%d).log
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
- **Log-first debugging** - Always check `~/.vido/log/` before reading code
- **Automated testing** - Use `curl` to port 3002 for key simulation, then verify logs
- **Keyboard-first** - All interactions keyboard accessible, no mouse
- **Immutable data** - Domain operations return new objects, never mutate in place