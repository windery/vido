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

**Interaction Principles**:
- **Keyboard-first**: All interactions keyboard accessible, visual cues enhance discoverability
- **Inline over overlay**: No modal dialogs; expand in place
- **Immediate feedback**: 200ms transitions, no decorative delays
- **Progressive disclosure**: Common options visible; advanced behind input/custom
- **4.5:1 contrast ratio** minimum for all text

### Implementation Requirements
- Every UI change must enhance productivity and reduce cognitive load
- Test all interfaces in dark mode first (primary use case)
- Design for extended usage (reduce eye strain, optimize for flow state)

## Architecture Overview

Vido is a vim-style todo manager built with Electron + Vue 3 + TypeScript, strictly following vim paradigms with keyboard-only interaction.

### 3-Layer Architecture

**1. Domain Layer** (`src/domain/`)
- `application-state-manager.ts` - Primary state manager  
- `state-machine.ts` - State transition logic
- `keyboard-handler.ts` - Pure business logic keyboard handling
- `observer.ts` - Decoupled communication interface

**2. Application Layer** (`src/composables/`)
- `useApplicationState.ts` - Vue reactive state adapter
- `useKeyboardActions` - Keyboard operation Composable
- `useStateDebug` - Debug Composable

**3. UI Layer** (`src/components/`)
- `TodoList.vue` - Main UI component
- `LastLine.vue` - Command line interface
- `ModeDebug.vue` - Debug interface

### Key Components

**Unified Keyboard Manager** (`src/utils/keyboard-manager.ts`):
- Editor state-based event distribution
- Entity information awareness (task, position, selection)
- Global event handling with mode-specific logic
- vim-style key sequences support (`dd`, `gg`, `yy`)
- Direct ApplicationStateManager integration

**State Management Flow**:
1. `ApplicationState` interface defines complete state
2. `ApplicationStateManager.transition()` handles changes
3. `useApplicationState()` provides Vue reactive binding
4. Observer pattern notifies UI of state changes

### Architecture Status (CRITICAL)

**✅ New Architecture Complete**:
- Old Pinia stores completely removed
- Unified keyboard system (keyboard-manager.ts only)
- Pure state management through useTaskState()
- Complete test suite based on new architecture

**❌ Prohibited Patterns**:
```typescript
// ❌ NEVER use these - immediately delete
import { useApplicationState } from '../composables/useApplicationState';
import { taskStore } from '../store/task';
import { editorStore } from '../store/editor';

// ✅ ONLY use this pattern
import { useTaskState } from '../composables/use-task-state';
const { tasks, selectedTask, selectTask, transition } = useTaskState();
```

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
# 1. Start the dev server (test API on port 3002)
pkill -f "Electron.*vido" 2>/dev/null
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
- `src/domain/` - Core business logic (keyboard, state machine, types)
- `src/components/` - Vue components (TodoList, LastLine, ModeDebug)
- `src/utils/` - Utilities (logger, keyboard manager, test API)
- Mouse interactions globally disabled via CSS (keyboard-only)

### Development Requirements
- **Always verify changes** - Use API testing and log analysis
- **Log all data changes** - Use `logger.info()` for modifications
- **Check logs first** - Review before investigating code issues
- **Keyboard-first design** - All interactions must be keyboard accessible
- **State transitions logged** - Help debug unexpected behavior