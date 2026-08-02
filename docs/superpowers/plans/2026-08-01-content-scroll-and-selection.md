# 内容区滚动跟随光标 + 选中任务强化 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 内容区最大高度拓宽到 60vh，超长内容在 textarea 内部滚动并即时跟随光标；选中任务行与展开内容区通过明暗 + 光晕强化显示。

**Architecture:** 滚动跟随完全依赖浏览器原生行为 —— textarea 的 JS 高度逻辑（`adjustHeight` 设 `height = scrollHeight`）保持不变，只给 `.content-editor` 加 CSS `max-height` + `overflow-y: auto`，让内容超高时 textarea 内部出现滚动条，`setSelectionRange` 后浏览器原生即时滚动光标到可见区（零动画，vim 语义）。选中强化为纯 CSS（`box-shadow` 光晕 + `color-mix` 半透明 accent + 左边框加粗点亮）。

**Tech Stack:** Vue 3 + TypeScript + Vite + Vitest；CDP（Chrome DevTools Protocol）驱动 headless Chrome 做渲染层集成验证。

## Global Constraints

- **vim-instant**（来自 spec C 节，已固化 CLAUDE.md）：光标移动、导航、滚动零动画即时生效；所有其他反馈过渡 ≤ 150ms（倾向 ≤ 100ms）；禁止装饰性长动画。
- `.task-content-area` 最大高度 **60vh**（从固定 500px 改）。
- `.content-editor`：`overflow-x: hidden; overflow-y: auto` + `max-height: calc(60vh - 24px)`（24px = 容器垂直 padding 18px + border 2px + 4px 余量，保证容器不裁剪）。
- accent 半透明一律用 `color-mix(in srgb, var(--accent) N%, transparent)`（Electron 29 = Chromium 122，支持 color-mix），不新增硬编码色值。
- 保持设计令牌一致性，不引入新主题变量；改动局限在 `TaskItem.vue` 与 `TaskContent.vue` 的 `<style scoped>`。
- 验证方式：后台执行，不弹窗抢焦点；以日志/CDP 输出为准。

---
## 文件结构

| 文件 | 职责 | 改动 |
|---|---|---|
| `src/renderer/components/TaskContent.vue` | 内容区容器 + textarea | `.task-content-area` max-height 500px→60vh；`.content-editor` overflow + max-height；`.task-content-area.show` 选中强化 |
| `src/renderer/components/TaskItem.vue` | 任务行 | `.task-line.selected` 光晕强化 |
| `/tmp/vido-scroll-verify.mjs` | CDP 集成验证脚本（临时，不入库） | 新建 |

JS 逻辑（`adjustHeight`、`updateContentWithCursorLocal`）**不改** —— CSS `max-height` cap 即可让 textarea 内部滚动。

---

### Task 1: 内容区高度拓宽 + textarea 内部滚动跟随光标

**Files:**
- Modify: `src/renderer/components/TaskContent.vue`（`<style scoped>` 中 `.task-content-area` 与 `.content-editor`）
- Test: `/tmp/vido-scroll-verify.mjs`（CDP 集成验证，临时文件）

**Interfaces:**
- Consumes: 现有 textarea 绑定（`:value` / `@input` / `@keyup` / `@keydown`）、`adjustHeight()`（JS 不改）、`computeNavSelection`（上一提交已接入）。
- Produces: 内容超高时 `.content-editor` 成为内部滚动容器；导航光标移动即时跟随。Task 2 复用同一构建产物。

- [ ] **Step 1: 修改 TaskContent.vue 样式**

把 `.task-content-area` 的 `max-height: 500px` 改为 `60vh`（保持 `overflow: hidden`，仍承担 show 过渡动画）：

```css
.task-content-area.show {
    opacity: 1;
    max-height: 60vh;
}
```

把 `.content-editor` 的 `overflow: hidden` 改为横向隐藏 + 纵向滚动，并加 `max-height`（textare JS 高度被 cap，超高即内部滚动，光标原生即时跟随）：

```css
.content-editor {
    background: transparent;
    border: none;
    color: var(--text);
    padding: 0;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.65;
    resize: none;
    width: 100%;
    min-height: 24px;
    box-sizing: border-box;
    overflow-x: hidden;
    overflow-y: auto;
    max-height: calc(60vh - 24px);
    height: auto;
    display: block;
    caret-color: var(--accent-bright);
}
```

- [ ] **Step 2: 构建渲染层并启动验证环境**

```bash
export PATH="/Users/huanglang/.local/share/fnm/node-versions/v24.11.1/installation/bin:$PATH"
cd /Users/huanglang/FrontendProjects/vido
pnpm exec vite build
python3 -m http.server 8123 --directory dist &
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --remote-debugging-port=9222 --user-data-dir=/tmp/vido-cdp-profile about:blank &
```

预期：`vite build` 成功，8123/9222 均就绪（`curl -s http://localhost:8123/` 返回 200，`curl -s http://localhost:9222/json/version` 返回 JSON）。

- [ ] **Step 3: 编写 CDP 验证脚本 `/tmp/vido-scroll-verify.mjs`**

脚本做三件事：(1) 新建任务并把内容设为 100 行；(2) 进入内容导航，断言 textarea 出现内部滚动（`scrollHeight > clientHeight`）；(3) `G` 跳到末行，断言 `scrollTop > 0` 且光标（selectionStart）已滚入可见区。

```js
// 通过 CDP 验证内容导航滚动跟随光标（对齐 /tmp/vido-nav-verify.mjs 的模式）
const CDP_HTTP = 'http://localhost:9222/json';

async function main() {
  const created = await fetch(`${CDP_HTTP}/new?http://localhost:8123/`, { method: 'PUT' });
  const target = await created.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let msgId = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++msgId; pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.result?.exceptionDetails) return { __error: r.result.exceptionDetails.text };
    return r.result?.result?.value;
  };
  const key = async (key, code) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers: 0 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers: 0 });
    await new Promise((r) => setTimeout(r, 200));
  };

  await new Promise((r) => setTimeout(r, 3000));

  // 1. 空缓冲区时建任务
  let rows = await evaluate(`document.querySelectorAll('.task-line').length`);
  if (!rows) {
    await key('o', 'KeyO');
    await send('Input.insertText', { text: 'scroll-test' });
    await key('Enter', 'Enter');
    await new Promise((r) => setTimeout(r, 400));
  }

  // 2. 选中第一个任务
  await key('j', 'KeyJ');
  await new Promise((r) => setTimeout(r, 200));

  // 3. 进入内容导航（i）→ 内容编辑（i），写入 100 行内容
  await key('i', 'KeyI');
  await new Promise((r) => setTimeout(r, 200));
  await key('i', 'KeyI');
  await new Promise((r) => setTimeout(r, 200));
  const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1} - ${'x'.repeat(20)}`).join('\n');
  const written = await evaluate(`(() => {
    const ta = document.querySelector('.content-editor');
    if (!ta) return false;
    ta.value = ${JSON.stringify(lines)};
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new KeyboardEvent('keyup', { key: 'l', bubbles: true }));
    return true;
  })()`);
  console.log('written:', written);
  await new Promise((r) => setTimeout(r, 400));

  // 4. Esc 回内容导航
  await key('Escape', 'Escape');
  await new Promise((r) => setTimeout(r, 500));

  // 5. 断言内部滚动存在 + 光标在首行可见
  const nav = await evaluate(`(() => {
    const ta = document.querySelector('.content-editor');
    if (!ta) return { found: false };
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight);
    const sel = ta.selectionStart;
    const before = ta.value.slice(0, sel).split('\\n').length - 1; // 光标行号
    return {
      found: true,
      readonly: ta.readOnly,
      scrollHeight: ta.scrollHeight,
      clientHeight: ta.clientHeight,
      scrollTop: ta.scrollTop,
      scrollable: ta.scrollHeight > ta.clientHeight,
      cursorLine: before,
      cursorVisible: ta.scrollTop <= before * lineHeight && before * lineHeight < ta.scrollTop + ta.clientHeight,
    };
  })()`);
  console.log('NAV initial:', JSON.stringify(nav));
  console.log(nav.found && nav.readonly && nav.scrollable
    ? 'PASS: 内容超高时 textarea 内部可滚动'
    : 'FAIL: 未出现内部滚动');

  // 6. G 跳到末行，断言 scrollTop 变大且光标滚入可见区
  await key('G', 'KeyG');
  await new Promise((r) => setTimeout(r, 400));
  const navEnd = await evaluate(`(() => {
    const ta = document.querySelector('.content-editor');
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight);
    const sel = ta.selectionStart;
    const before = ta.value.slice(0, sel).split('\\n').length - 1;
    return {
      scrollTop: ta.scrollTop,
      cursorLine: before,
      cursorVisible: ta.scrollTop <= before * lineHeight && before * lineHeight < ta.scrollTop + ta.clientHeight,
      nearBottom: ta.scrollTop + ta.clientHeight >= ta.scrollHeight - 2,
    };
  })()`);
  console.log('NAV after G:', JSON.stringify(navEnd));
  console.log(navEnd.scrollTop > 0 && navEnd.cursorVisible
    ? 'PASS: 光标移到末行，textarea 即时滚动跟随'
    : 'FAIL: 滚动未跟随光标');

  ws.close();
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
```

- [ ] **Step 4: 运行 CDP 脚本并确认 PASS**

```bash
export PATH="/Users/huanglang/.local/share/fnm/node-versions/v24.11.1/installation/bin:$PATH"
node /tmp/vido-scroll-verify.mjs
```

预期输出两条 `PASS`：
1. `PASS: 内容超高时 textarea 内部可滚动`
2. `PASS: 光标移到末行，textarea 即时滚动跟随`

若 `cursorVisible` 为 false，检查 `.content-editor` 的 `line-height` 与 `max-height` 是否生效（构建产物 `dist/assets/*.css` 中应包含 `max-height:calc(60vh - 24px)` 与 `overflow-y:auto`）。

- [ ] **Step 5: 提交**

```bash
git -C /Users/huanglang/FrontendProjects/vido add src/renderer/components/TaskContent.vue
git -C /Users/huanglang/FrontendProjects/vido commit -m "feat: 内容区拓宽至 60vh，超长内容 textarea 内部滚动即时跟随光标"
```

---

### Task 2: 选中任务行 + 展开内容区强化显示

**Files:**
- Modify: `src/renderer/components/TaskItem.vue`（`.task-line.selected` 光晕）
- Modify: `src/renderer/components/TaskContent.vue`（`.task-content-area` 强化：左边框加粗点亮、背景提亮、accent 描边）
- Test: 复用 Task 1 的 CDP 环境，新增样式断言

**Interfaces:**
- Consumes: Task 1 的构建产物（已含滚动能力）；现有令牌 `--accent` / `--accent-bright` / `--bg-content` / `--bg-selected`。
- Produces: 选中任务行与展开内容区视觉强化；与 Task 1 无顺序依赖之外的联系。

- [ ] **Step 1: 强化选中任务行（TaskItem.vue）**

在 `.task-line.selected` 上叠加 accent 光晕（提亮 + 外发光 + 1px 描边）：

```css
.task-line.selected {
    background: var(--bg-selected);
    color: var(--text-bright);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent),
        0 0 14px color-mix(in srgb, var(--accent) 12%, transparent);
}
```

- [ ] **Step 2: 强化展开内容区（TaskContent.vue）**

`.task-content-area` 默认左边框 3px `var(--check)`；在 `.show` 态改为 4px `var(--accent-bright)`、背景提亮一档、细描边 accent：

```css
.task-content-area {
    margin: 2px 8px 4px 70px;
    padding: 9px 12px;
    background: var(--bg-content);
    border: 1px solid var(--border-soft);
    border-left: 3px solid var(--check);
    border-radius: 0 5px 5px 0;
    opacity: 0;
    max-height: 0;
    overflow: hidden;
    transition: opacity 0.12s ease, max-height 0.12s ease, padding 0.08s ease;
}

.task-content-area.show {
    opacity: 1;
    max-height: 60vh;
    border-left-width: 4px;
    border-left-color: var(--accent-bright);
    background: color-mix(in srgb, var(--bg-content) 92%, var(--accent) 8%);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent);
}
```

注：`.show` 的 transition 保持 ≤ 150ms，符合 vim-instant 约束。

- [ ] **Step 3: CDP 断言选中强化样式**

沿用 Task 1 的 CDP 环境（build + 8123 + 9222 若已关则重启），新建 `/tmp/vido-select-verify.mjs`：

```js
const CDP_HTTP = 'http://localhost:9222/json';
async function main() {
  const created = await fetch(`${CDP_HTTP}/new?http://localhost:8123/`, { method: 'PUT' });
  const target = await created.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let msgId = 0;
  const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res) => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); return r.result?.result?.value; };
  const key = async (k, c) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: c, modifiers: 0 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: c, modifiers: 0 }); await new Promise((r) => setTimeout(r, 200)); };

  await new Promise((r) => setTimeout(r, 3000));
  // 造一个任务并进入内容导航，使内容区可见
  let rows = await evaluate(`document.querySelectorAll('.task-line').length`);
  if (!rows) { await key('o', 'KeyO'); await send('Input.insertText', { text: 'sel-test' }); await key('Enter', 'Enter'); await new Promise((r) => setTimeout(r, 400)); }
  await key('j', 'KeyJ'); await new Promise((r) => setTimeout(r, 200));
  await key('i', 'KeyI'); await new Promise((r) => setTimeout(r, 300));

  const style = await evaluate(`(() => {
    const line = document.querySelector('.task-line.selected');
    const area = document.querySelector('.task-content-area.show');
    if (!line || !area) return { line: !!line, area: !!area };
    return {
      lineShadow: getComputedStyle(line).boxShadow,
      areaBorderLeftWidth: getComputedStyle(area).borderLeftWidth,
      areaBorderLeftColor: getComputedStyle(area).borderLeftColor,
      areaShadow: getComputedStyle(area).boxShadow,
    };
  })()`);
  console.log('selected style:', JSON.stringify(style));
  const pass = style.lineShadow && style.lineShadow !== 'none'
    && style.areaBorderLeftWidth === '4px'
    && style.areaShadow && style.areaShadow !== 'none';
  console.log(pass ? 'PASS: 选中行光晕 + 内容区强化生效' : 'FAIL: 强化样式未生效');
  ws.close();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
```

- [ ] **Step 4: 运行并确认 PASS**

```bash
export PATH="/Users/huanglang/.local/share/fnm/node-versions/v24.11.1/installation/bin:$PATH"
node /tmp/vido-select-verify.mjs
```

预期：`PASS: 选中行光晕 + 内容区强化生效`。若失败，检查 `dist/assets/*.css` 中是否包含 `box-shadow` 与 `border-left-width:4px`，并确认 `.task-line` 的 `position: relative` 未破坏 `::before '›'` 定位。

- [ ] **Step 5: 提交**

```bash
git -C /Users/huanglang/FrontendProjects/vido add src/renderer/components/TaskItem.vue src/renderer/components/TaskContent.vue
git -C /Users/huanglang/FrontendProjects/vido commit -m "feat: 选中任务行 accent 光晕 + 展开内容区强化显示"
```

---

### Task 3: 全量回归验证

**Files:**
- Test: 全量 typecheck + vitest + lint

**Interfaces:**
- Consumes: Task 1 + Task 2 全部改动。
- Produces: 全绿证据，可交付。

- [ ] **Step 1: typecheck**

```bash
export PATH="/Users/huanglang/.local/share/fnm/node-versions/v24.11.1/installation/bin:$PATH"
cd /Users/huanglang/FrontendProjects/vido
pnpm run typecheck
```

预期：无类型错误。

- [ ] **Step 2: 全量测试**

```bash
pnpm test
```

预期：全部通过（含既有 `cursor.test.ts` 与 handler 测试）。

- [ ] **Step 3: lint**

```bash
pnpm lint
```

预期：无告警。

- [ ] **Step 4: 清理验证进程 + 提交**

```bash
pkill -f "vido-cdp-profile" 2>/dev/null; pkill -f "http.server 8123" 2>/dev/null
git -C /Users/huanglang/FrontendProjects/vido status --short
```

预期：仅显示 Task 1/2 已提交的干净树；若任务尚未提交则一并提交。提交信息如仍有未提交改动：`git add` 对应文件后 `git commit -m "chore: 内容滚动与选中强化全量验证通过"`。

---
