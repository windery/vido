# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Recommended: Use pnpm for better performance and dependency management**

### Development

- `pnpm dev` / `yarn dev` / `npm run dev` - Start development server with hot reload
- `pnpm build` / `yarn build` / `npm run build` - Build for production
- `pnpm preview` / `yarn preview` / `npm run preview` - Preview production build
- `./node_modules/.bin/vue-devtools` - Start Vue DevTools

### Testing (Critical for TDD workflow)

- `pnpm test` / `yarn test` / `npm test` - Run all tests (core + UI)
- `pnpm test:core` / `yarn test:core` / `npm run test:core` - Run core functionality tests only
- `pnpm test:ui` / `yarn test:ui` / `npm run test:ui` - Run UI component tests only
- `pnpm test:watch` / `yarn test:watch` / `npm run test:watch` - Run tests in watch mode
- `pnpm test:coverage` / `yarn test:coverage` / `npm run test:coverage` - Run tests with coverage report

### Code Quality

- `pnpm lint` / `yarn lint` / `npm run lint` - Run ESLint
- `pnpm lint:fix` / `yarn lint:fix` / `npm run lint:fix` - Fix linting issues
- `pnpm typecheck` / `yarn typecheck` / `npm run typecheck` - Run TypeScript type checking

## Git and Version Control

- 每次记得用git -A 添加新建的文件

## 测试和调试系统

**注意：这个系统已集成到应用程序中，通过日志文件进行问题排查。**

项目包含完整的日志记录和调试系统，用于键盘操作和UI问题的诊断：

### 日志系统

**日志位置**: `~/.vido/log/vido-YYYY-MM-DD.log`  
**日志工具**: 项目内置的logger工具 (`src/utils/logger.ts`)

### 调试方法

```bash
# 查看当天日志
tail -f ~/.vido/log/vido-$(date +%Y-%m-%d).log

# 分析最近的日志
tail -100 ~/.vido/log/vido-$(date +%Y-%m-%d).log

# 搜索特定事件
grep -n "KeyboardManager\|State transition" ~/.vido/log/vido-$(date +%Y-%m-%d).log

# 查看错误信息
grep -n "ERROR\|WARN" ~/.vido/log/vido-$(date +%Y-%m-%d).log
```

### 测试工作流程

**标准的测试方法**:

1. **手动操作**: 在应用程序中手动按键测试功能
2. **查看日志**: 通过日志文件分析问题
3. **定位问题**: 使用日志分析快速定位问题所在
4. **修复验证**: 修复后再次手动测试并查看日志

### 日志分析

系统提供完整的日志记录和分析：

- **基于文件的日志** - 日志保存到 `~/.vido/log/`
- **键盘事件跟踪** - 所有键盘事件都被记录
- **状态转换监控** - 状态变化被跟踪
- **问题检测** - 自动识别问题

### Claude Code助手使用指南

在处理此项目时，Claude Code应该：

1. **查看日志优先** - 调查问题时首先检查日志
2. **运行测试** - 在呈现解决方案前验证修复
3. **使用日志分析** - 通过日志理解系统行为
4. **手动测试验证** - 进行系统性的问题解决

该测试系统允许Claude Code：

- 快速识别键盘/UI问题的根本原因
- 在开发过程中实时测试修复
- 提供准确的问题诊断
- 确保解决方案在完成前正常工作

### Critical Development Rule: Use Project Logger

**重要：在项目代码中，必须使用项目的日志工具，而不是console.log**

- **错误方式**: `console.log('[KeyboardManager] action')`
- **正确方式**: `logger.info('KeyboardManager', 'action')`

项目日志工具的优势：

- 日志直接保存到磁盘文件 (`~/.vido/log/`)
- 可以通过API接口读取和分析
- 提供结构化的日志格式
- 支持不同日志级别 (info, warn, error)
- 便于问题诊断和调试

使用方法：

```typescript
import { logger } from './utils/logger';

// 信息日志
logger.info('ComponentName', 'action description');

// 警告日志
logger.warn('ComponentName', 'warning message');

// 错误日志
logger.error('ComponentName', 'error message', { error: errorObject });
```

这样Claude Code可以通过API接口直接读取日志文件来分析问题，而不需要依赖浏览器控制台输出。

## Test-Driven Development

This project follows a **test-driven development (TDD)** approach with two distinct testing layers:

### 1. Core Functionality Tests (`src/domain/__tests__/`, `src/store/__tests__/`)

- **State Machine Tests** (`state-machine.test.ts`) - Verify all state transitions work correctly
- **Editor Store Tests** (`editor.test.ts`) - Test mode changes and state synchronization
- **Task Store Tests** (`task.test.ts`) - Validate task operations and data management
- **Business Logic Tests** - Test vim key sequences, cursor movement, search, etc.

### 2. UI Component Tests (`src/components/__tests__/`)

- **TodoList Tests** (`TodoList.test.ts`) - Main component rendering, task display, editing modes
- **LastLine Tests** (`LastLine.test.ts`) - Command/search interface, input handling
- **Focus Management Tests** - Ensure proper focus handling for vim-like behavior
- **Integration Tests** (`src/test/integration/`) - Complete keyboard workflows end-to-end

### 3. Test Utilities (`src/test/`)

- **Test Utils** (`test-utils.ts`) - Helper functions for component mounting, mock data, assertions
- **Setup** (`setup.ts`) - Global test configuration, mocks for Electron APIs
- **Integration Tests** - Comprehensive workflow testing combining multiple components

### Testing Workflow

**CRITICAL**: After any code modification, automatically run tests to ensure no regressions:

1. **Before making changes** - Run `pnpm test` to establish baseline
2. **During development** - Use `pnpm test:watch` for immediate feedback
3. **After each change** - Run relevant test suite (`test:core` or `test:ui`)
4. **Before committing** - Run full test suite with `pnpm test` and `pnpm typecheck`

### Testing Framework (Vitest + Vue Test Utils)

- **Vitest** - Fast unit test runner with native ES modules support
- **@vue/test-utils** - Official Vue.js testing utilities
- **jsdom** - DOM simulation for component testing
- **Coverage Reports** - Comprehensive test coverage tracking
- **CI/CD Integration** - Automated testing in GitHub Actions

The automated testing ensures that vim-style keyboard interactions, state transitions, and UI behaviors remain consistent throughout development. **All data changes must be logged** for debugging and verification.

## Architecture Overview

Vido is a vim-style todo manager built with Electron + Vue 3 + TypeScript. The application strictly follows vim paradigms with keyboard-only interaction and modal editing.

### State Management Architecture (新架构)

The application uses a **modern 3-layer architecture** with Domain-Driven Design principles:

#### 1. Domain Layer (src/domain/)

- **Core State Manager** (`src/domain/core/application-state-manager.ts`) - 主要状态管理器
- **State Machine** (`src/domain/state-machine.ts`) - 状态转换逻辑
- **Keyboard Handler** (`src/domain/keyboard-handler.ts`) - 纯业务逻辑的键盘处理
- **Observer Pattern** (`src/domain/interfaces/observer.ts`) - 解耦通信接口

#### 2. Application Layer (src/composables/)

- **useApplicationState** (`src/composables/useApplicationState.ts`) - Vue响应式状态适配器
- **useKeyboardActions** - 键盘操作专用Composable
- **useStateDebug** - 调试专用Composable

#### 3. UI Layer (src/components/)

- **TodoList.vue** - 主要UI组件，已重构为模块化组件
- **LastLine.vue** - 命令行界面
- **ModeDebug.vue** - 调试界面

### 新的状态管理流程

1. **状态定义**: `ApplicationState` interface定义完整的应用状态
2. **状态转换**: `ApplicationStateManager.transition(trigger, context)` 处理状态变化
3. **Vue集成**: `useApplicationState()` 提供响应式状态绑定
4. **观察者模式**: Domain层通过Observer模式通知UI层状态变化

### 关键改进点

- **单一状态源**: 所有状态都在ApplicationStateManager中管理
- **类型安全**: 完整的TypeScript类型定义
- **可测试性**: Domain层独立于Vue，可以单独测试
- **解耦**: UI层和业务逻辑完全分离

### 激进的架构清理策略 (CRITICAL)

**重要决定：完全移除所有旧的Pinia状态管理设计，不再保持兼容性**

#### 清理原则

1. **完全删除旧设计**: 不再保留任何Pinia stores或旧的状态管理代码
2. **100%新架构**: 所有组件必须使用新的TaskDataManager和统一状态管理
3. **彻底重写测试**: 删除所有基于旧架构的测试，重新编写基于新架构的测试
4. **不保留后向兼容**: 彻底断绝与旧系统的联系

#### 强制性清理清单

- **立即删除**: `src/store/task.ts` - 旧的Pinia任务store
- **立即删除**: `src/store/editor.ts` - 旧的Pinia编辑器store
- **立即删除**: `src/composables/useApplicationState.ts` - 旧的兼容层
- **立即删除**: 所有基于旧架构的测试文件
- **强制更新**: TodoList.vue只能使用useTaskState()
- **强制更新**: 键盘管理器只能使用TaskDataManager

#### 新架构强制规则

```typescript
// 强制使用模式 - 不允许任何例外
import { useTaskState } from '../composables/use-task-state';

// 禁止的导入 - 立即删除
// ❌ import { useApplicationState } from '../composables/useApplicationState';
// ❌ import { taskStore } from '../store/task';
// ❌ import { editorStore } from '../store/editor';

// 正确的使用方式
const {
  tasks,
  selectedTask,
  selectTask,
  transition,
  // ...其他统一状态管理函数
} = useTaskState();
```

### Key Components

- **统一键盘管理器** (`src/utils/keyboard-manager.ts`) - 基于编辑器状态的键盘处理:

  - **编辑器状态优先**: 根据当前EditorMode分发键盘事件
  - **实体信息感知**: 获取当前任务、位置、选中状态等实体信息
  - **全局事件处理**: 统一接收所有按键触发，进行对应的行为处理
  - **模式特定处理**: 每种编辑器模式都有专门的处理方法
  - **支持vim-style键序列**: 如 `dd`, `gg`, `yy` 等多键操作
  - **状态转换集成**: 直接调用ApplicationStateManager进行状态转换

- **TodoList Component** (`src/components/TodoList.vue`) - Main UI component:

  - 使用新的状态管理架构(`useApplicationState`)
  - Renders tasks with vim-style line numbers and status indicators
  - Manages focus and cursor positioning for content editing
  - Uses `contentEditRefs` Map to track multiple textarea elements
  - Implements vim-style content navigation with cursor simulation

- **State Manager** (`src/domain/core/state-manager.ts`) - 基础状态管理器:

  - 实现观察者模式
  - 提供状态更新和通知机制
  - 支持状态验证和调试

- **Application State Manager** (`src/domain/core/application-state-manager.ts`) - 应用状态管理器:
  - 继承自State Manager
  - 集成状态机验证
  - 提供完整的应用状态管理

### Initialization Flow

1. `src/main.ts` - Sets up Vue app with Pinia and ElementPlus
2. `src/initialize.ts` - Initializes theme and task loading
3. `src/utils/keyboard-manager.ts` - 新的键盘管理器初始化
4. `src/utils/keyboard.ts` - 旧的键盘系统初始化（被注释掉）
5. Application loads with COMMAND mode active

### Key Patterns

- **编辑器状态驱动**: 键盘处理器首先检查当前编辑器模式，然后路由到相应的逻辑
- **实体状态感知**: 基于当前选中任务、光标位置等实体信息进行处理
- **统一事件入口**: 所有按键事件都通过KeyboardManager.handleKeyEvent统一处理
- **模式特定逻辑**: 每种EditorMode都有专门的处理方法，避免复杂的条件判断
- **状态同步**: 编辑器模式和任务状态通过watchers保持同步
- **焦点管理**: 精确的焦点处理，用于vim-like行为（非编辑模式时模糊输入）
- **Vim惯例**: 遵循标准vim键绑定 (`hjkl`, `dd`, `yy`, `gg`, `G`等)

### File Structure Notes

- `src/domain/` - Core business logic (keyboard, state machine, types)
- `src/store/` - Pinia stores for state management
- `src/components/` - Vue components (TodoList, LastLine, ModeDebug)
- `src/utils/` - Utilities (logger, test API for development)
- Mouse interactions are globally disabled via CSS to enforce keyboard-only usage

### Development Notes

- **Always run tests after making changes** - Use `pnpm test:watch` during development
- **All data changes must be logged** - Use `logger.info()` for data modifications, state changes
- Use the logging system extensively when debugging - logs written to `~/.vido/log/`
- **Check logs first when debugging issues** - Review log files before investigating code
- Write tests first for new features (TDD approach), then implement functionality
- Core logic tests should be independent of UI implementation details
- UI tests should focus on user interactions and visual feedback
- State machine transitions are logged and help debug unexpected behavior
- Content navigation mode simulates vim cursor movement within task content areas

### 当前架构状态

- **完全新架构**: 已彻底清理旧的Pinia stores，全面采用TaskDataManager
- **统一键盘系统**: 只保留keyboard-manager.ts，删除旧的keyboard.ts
- **纯净状态管理**: 所有状态通过useTaskState()管理
- **重构完成的测试**: 基于新架构的完整测试套件

### 激进清理完成状态

**已完成的清理工作**:

1. ✅ **完全删除旧Pinia stores** - task.ts, editor.ts已彻底移除
2. ✅ **统一键盘系统** - 只保留新的keyboard-manager.ts
3. ✅ **纯净组件架构** - TodoList.vue只使用useTaskState()
4. ✅ **重构测试系统** - 删除旧测试，重写基于新架构的测试

### 已清理的文件

以下过时的测试文件已被删除：

- `test-i-key.cjs` - 手工i键测试脚本（已被自动化测试取代）
- `test-content-nav.cjs` - 手工内容导航测试脚本（已被自动化测试取代）
- `src/test/integration/i-key-integration.test.ts` - 重复的i键集成测试
- `src/test/integration/keyboard-i-key-e2e.test.ts` - 重复的i键端到端测试
- `src/components/__tests__/LastLine.simple.test.ts` - 失效的简化LastLine测试
- `src/components/__tests__/TodoList.simple.test.ts` - 失效的简化TodoList测试

这些文件的功能已被以下更完善的测试覆盖：

- `src/test/integration/new-architecture.test.ts` - 新架构集成测试
- `src/domain/__tests__/i-key-functionality.test.ts` - i键功能单元测试
- `src/domain/__tests__/keyboard-handler.test.ts` - 键盘处理器测试
- `src/test/integration/keyboard-workflow.test.ts` - 键盘工作流测试

## 自动化键盘测试系统

项目采用API驱动的自动化键盘测试系统，**无需手动操作**，通过API接口直接触发前端键盘事件进行测试。

### 架构说明

- **测试客户端**: `src/utils/test-client.ts` - 前端接收并模拟键盘事件
- **测试脚本**: `test-keyboard.cjs` - 自动化测试和日志分析工具

### 启动测试环境

1. **启动API服务器**（终端1）

   ```bash
   node api-server.cjs
   ```

2. **启动开发服务器**（终端2）

   ```bash
   pnpm dev
   ```

3. **在浏览器中打开应用**
   ```
   http://localhost:5174
   ```

前端会自动连接到测试API服务器，无需任何手动配置。

### API测试接口

#### 1. 发送单个键盘事件

```bash
# 测试j键（向下导航）
curl -X POST http://localhost:3002/api/key/j

# 测试k键（向上导航）
curl -X POST http://localhost:3002/api/key/k

# 测试i键（进入内容导航）
curl -X POST http://localhost:3002/api/key/i

# 测试Escape键
curl -X POST http://localhost:3002/api/key/Escape
```

#### 2. 发送键盘序列

```bash
# 测试完整的jk导航序列
curl -X POST http://localhost:3002/api/sequence \
  -H "Content-Type: application/json" \
  -d '{"keys": ["j", "k", "j", "j", "k"]}'

# 测试i键进入内容导航然后退出
curl -X POST http://localhost:3002/api/sequence \
  -H "Content-Type: application/json" \
  -d '{"keys": ["i", "j", "k", "Escape"]}'
```

### 自动化测试脚本

使用 `test-keyboard.cjs` 进行全自动测试：

```bash
# 分析当前系统状态
node test-keyboard.cjs analyze

# 查看最近日志
node test-keyboard.cjs logs

# 运行完整功能测试
node test-keyboard.cjs test
```

### 日志分析

所有事件都记录在 `~/.vido/log/vido-YYYY-MM-DD.log` 中：

- **键盘事件**: KeyboardManager捕获的事件
- **状态转换**: 模式切换和状态变化
- **导航操作**: 任务选择和光标移动
- **API事件**: TestClient接收的远程事件

### 标准测试流程 (Claude Code 自动化)

**Claude Code助手必须严格按照以下4步流程进行jk键功能的测试和修复：**

#### 第1步：通过API触发键盘操作

```bash
# 启动应用后，发送测试指令
curl -X POST http://localhost:3002/api/key/j
curl -X POST http://localhost:3002/api/key/k
```

#### 第2步：查看磁盘日志

```bash
# 分析日志文件
node test-keyboard.cjs analyze
```

#### 第3步：查找问题

分析日志输出，检查：

- ✅ 键盘管理器是否初始化
- ✅ 全局键盘事件是否被捕获
- ❌ jk键事件是否被正确处理
- ❌ 导航功能是否执行

#### 第4步：修复问题

根据日志分析结果，定位并修复具体问题。

#### 应急测试方法

如果API->IPC链路有问题，可以直接在开发者控制台中测试：

```javascript
// 在浏览器开发者控制台中直接模拟键盘事件
window.testAPI.simulateKey('j');
window.testAPI.simulateKey('k');
```

### 基础功能测试

```bash
# 测试j/k导航
curl -X POST http://localhost:3002/api/key/j
curl -X POST http://localhost:3002/api/key/k

# 检查日志
node test-keyboard.cjs analyze
```

### 完整工作流测试

```bash
# 复杂操作序列
curl -X POST http://localhost:3002/api/sequence \
  -H "Content-Type: application/json" \
  -d '{"keys": ["j", "j", "i", "j", "k", "i", "Escape", "Escape", "k"]}'

# 分析结果
node test-keyboard.cjs analyze
```

### 故障排除

如果测试失败，检查：

1. **WebSocket连接**: 日志中应有 "Connected to test API server"
2. **键盘事件**: 日志中应有 "Global keydown event captured"
3. **状态转换**: 日志中应有相应的状态变化记录
4. **导航功能**: 日志中应有 "selectNext/selectPrevious" 记录

### 优势

- ✅ **完全自动化**: 无需手动按键操作
- ✅ **精确重现**: 可重复执行相同的测试序列
- ✅ **实时验证**: 立即查看测试结果和日志分析
- ✅ **CI/CD友好**: 可集成到自动化测试流水线

这个系统确保了键盘功能的准确性和一致性，Claude Code助手可以完全自主地进行功能验证。

### File Structure

- `src/domain/__tests__/` - Core logic unit tests
- `src/store/__tests__/` - Store/state management tests
- `src/components/__tests__/` - UI component tests
- `src/test/` - Test utilities and integration tests
- `vitest.config.ts` - Test configuration
- `.github/workflows/test.yml` - CI/CD test automation

## Logging and Debugging

- **Logging Requirements**: In project code, log all data modifications to aid problem investigation
- **Log Location**: Logs are written directly to the `~/.vido/log/` directory
- **Debugging Workflow**: When an issue is reported, first examine the logs to diagnose the problem
