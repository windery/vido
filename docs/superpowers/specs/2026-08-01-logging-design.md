# 日志系统设计（v2）

日期：2026-08-01
状态：已批准

## 背景与目标

当前日志系统的目标是让 **agent 仅凭日志即可回溯一次完整操作流并定位问题**，无需阅读源码。本设计固化三层要求：

1. **数据变更操作必须有日志** —— 每条数据变更（增删改、撤销重做、搜索、保存）都产生一条结构化、可 grep 的日志。
2. **去除冗余重复日志** —— 高频导航、光标、DOM 聚焦等噪音降为 DEBUG（默认不输出）或删除。
3. **统一日志格式** —— 单行 `[ts] [LEVEL] [Module] message | key=value`，data 扁平化，跨渲染/主进程一致。

## 现状审计（2026-08-01）

- **数据变更零日志**：`store.ts` 的 `createNewTask` / `deleteSelectedTask` / `toggleTaskCompletion` / `updateTaskProperty` / `pasteTask` / `sortTasks` / `undo` / `redo` / `insertNewLineBelow` / `applySearch` / `clearSearch` 均无日志。
- **冗余噪音（INFO 级高频）**：
  - `TaskListManager` 选择导航：`selectTask` / `selectNext` / `selectPrevious` / `goToFirst` / `goToLast` 每次移动一条 `Selected task`。
  - `TodoList.vue`（TodoListRefactored）：光标更新、textarea 聚焦、DOM 查询等 10+ 条调试。
  - `LastLine.vue`：每次按键、IME 起止、可见性变化。
  - `ContentNavigationModeHandler`：`enableContentEditing` 内多条调试。
  - `use-cursor.ts`、`task-state-manager.ts` ref sync。
- **格式不统一**：message 自由模板 + `| Data: {json}`，data 序列化风格混乱。

## 日志格式规范

单行文本，data 扁平化为 `key=value`（值统一 `JSON.stringify` 以可逆）：

```
[2026-08-01T12:00:00.000Z] [INFO] [Store] create task | id=5 title="买牛奶" selected=true
```

- 时间戳：ISO 8601（`new Date().toISOString()`）。
- 级别：`ERROR > WARN > INFO > DEBUG`。
- `formatLogEntry(level, module, message, data?)` 为**纯函数**，是唯一格式来源。
- data 扁平化：`Object.entries(data).map(([k, v]) => `${k}=${JSON.stringify(v)}`)`，用 ` | ` 拼接在 message 后。
- 无 data 时不输出 ` | ` 后缀。

## 级别规范

| 级别 | 用途 |
|---|---|
| ERROR | 失败 / 异常（保存失败、加载失败、未知模式等） |
| WARN | 可恢复异常（任务不存在、无效参数、非法优先级） |
| INFO | **数据变更** + 关键事件（启动、模式切换、命令执行、保存/加载） |
| DEBUG | 高频导航、光标、DOM 细节（默认不输出） |

级别过滤：
- 渲染进程：`import.meta.env.VITE_LOG_LEVEL`，默认 `'INFO'`。
- 主进程（写盘）：`process.env.VIDO_LOG_LEVEL`，默认 `'INFO'`。
- `shouldLog(level)` 为**纯函数**：`LEVEL_ORDER[level] >= LEVEL_ORDER[LOG_LEVEL]` 才输出。

## 数据变更日志事件表

集中在 **Store 层**（单一事实来源，handler 不重复打数据变更日志）。统一 `logger.info('Store', '<action>', { details })`：

| 操作 | message | data |
|---|---|---|
| createNewTask | `create task` | `id, title` |
| deleteSelectedTask | `delete task` | `id, title` |
| toggleTaskCompletion | `toggle complete` | `id, completed`（变更后值） |
| updateTaskProperty | `update task` | `id, field, value` |
| pasteTask | `paste task` | `newId, fromId` |
| sortTasks | `sort tasks` | `type, count` |
| insertNewLineBelow | `insert line` | `taskId, line` |
| undo | `undo` | `step, total, tasks` |
| redo | `redo` | `step, total, tasks` |
| applySearch | `search` | `term, matches, selectedId` |
| clearSearch | `clear search` | — |
| save（已有） | `save` | `tasks, file` |

规则：数据变更日志在**变更发生之后**记录，data 取变更后的稳定值；`updateTaskProperty` 记录 `field` 与最终 `value`（不含中间态），供回放定位。

## 冗余日志处理清单

降为 DEBUG 或删除：
- `TaskListManager` 5 个选择导航方法 → DEBUG。
- `TodoList.vue`：删除 `updateContentWithCursor called` / `found textarea` / `focus result`；`saved cursor position` → DEBUG。
- `LastLine.vue`：删除按键/IME/可见性日志，仅保留关键流程（`handleEnterKey` 委托）→ DEBUG。
- `ContentNavigationModeHandler`：`enableContentEditing` 多条 → DEBUG 或合并为一条。
- `use-cursor.ts`、`task-state-manager.ts` ref sync → DEBUG。

保留 INFO：`Persistence` save/load、`Prefs` 初始化/切换、状态机 transition、命令执行、`MainProcess` 启动/退出、IPC 错误、文件操作成功/失败。

## 实现架构

- **渲染进程** `src/renderer/utils/logger.ts`：
  - 导出纯函数 `formatLogEntry(level, module, message, data?)`、`shouldLog(level)`。
  - 队列改存**结构化 entry** `{ level, module, message, data }`；console 输出用 `formatLogEntry`；IPC 发送结构化对象。
- **主进程** `src/main/logger.ts`：
  - 同构纯函数；`writeLogToFile(entry)` 接收结构化对象，写入前按 `VIDO_LOG_LEVEL` 过滤；导出 `getLogFilePath()`。
  - `formatLogEntry` 与 `shouldLog` 逻辑与渲染进程一致（两处实现，各有独立单测）。
- **preload** `src/preload/index.ts`：`vidoLogger.writeLog(entry)` 接收结构化对象。
- **主进程 IPC** `src/main/index.ts`：`write-log` handler 接收结构化对象，调用 `writeLogToFile`。
- **store 层** `src/renderer/domain/state/store.ts`：在各数据变更方法内添加 `logger.info('Store', action, details)`。
- **启动提示**：主进程 ready 后 `logger.info('MainProcess', 'Log file', { path: getLogFilePath() })`。

## 测试策略（TDD）

1. `formatLogEntry` 纯函数测试：
   - 无 data → `[ts] [LEVEL] [Module] message`
   - 有 data → `... | id=5 title="买牛奶"`
   - 特殊字符（含 `|`、引号）值安全转义。
2. `shouldLog` 测试：级别阈值（INFO 过滤 DEBUG、ERROR 恒输出）。
3. Store 数据变更日志测试（`vi.spyOn(logger, 'info')`）：
   - 每次 create/delete/toggle/update/paste/sort/undo/redo 断言恰好一条 `[Store]` INFO 日志，且 data 含对应字段（如 `id`）。
   - 非变更操作（selectTask）不产生 `[Store]` INFO 数据变更日志。

## 验证

- `pnpm typecheck && pnpm test && pnpm lint` 全绿。
- 全量 151 测试通过（原 126 不回归，新增 logger 纯函数 13 条 + store 数据变更日志 12 条）。
- `pnpm test:core`（domain/i18n/utils/main）与 `pnpm test:coverage` 均可运行。
- 日志文件确认：`~/.vido/log/vido-YYYY-MM-DD.log`。
