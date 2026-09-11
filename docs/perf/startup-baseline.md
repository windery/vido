# 启动性能基线（2026-09-11）

本文件记录 vido 启动耗时与内存的**实测**基线，供「是否更换运行时（Electron → Tauri / Flutter）」这类决策引用。
所有数字均为本机实测（macOS arm64，Apple Silicon，Electron 29.4.6，Node v24.11.1），非估算。

## 测量方法

主指标是应用自己上报的 `total`——主进程内 `process.uptime()`，即**从进程创建到 `ready-to-show`**。
它不受测量脚本自身开销影响（`node` 冷启动约 40ms、轮询粒度 100ms），因此优于外部墙钟。

复现：

```bash
# 构建（注意：本仓库 pnpm 会因 node_modules 与 lockfile 状态检查触发重装，直接调本地二进制绕过）
./node_modules/.bin/vite build && ./node_modules/.bin/electron-builder --dir

# 生产路径（express 不加载）；HOME 覆盖用于数据隔离，窗口会短暂显示
HOME=/tmp/vido-measure-home VIDO_MEASURE_BACKGROUND=0 \
  VIDO_MEASURE_LOG=/tmp/vido-measure-home/.vido/log/vido-$(date +%F).log \
  APP_BIN="$PWD/release/<version>/mac-arm64/Vido.app/Contents/MacOS/Vido" \
  bash scripts/measure-startup.sh prod 3
```

分阶段数据来自 `VIDO_STARTUP_TRACE=1`（见 `src/main/index.ts`），默认关闭。

## 结果一：express 加载位置的生产 A/B

同一隔离 `HOME`、同一构建配置，**唯一变量**是 `src/main/index.ts` 中 `./test-server` 的导入方式。
每项取 3 次中位数。

| 指标 | 基线（静态 import） | 修复后（动态 import） | Δ |
| --- | --- | --- | --- |
| 启动 `total` | 343ms | **292ms** | **−51ms（−15%）** |
| 主进程 RSS（`ready-to-show` 时刻） | 186.8MB | **175.1MB** | **−11.7MB（−6.3%）** |
| 进程树总 RSS | 396.2MB | 389.3MB | −6.9MB（−1.7%） |

> 上表 RSS 为 `ready-to-show` 时刻采样。独立复核在**稳态**（T+3s）测得主进程增量约 **−6MB**
> （4 次 background vs 3 次 production）。两者都成立，差异仅来自采样点——引用时须注明采样点。

**根因**：`test-server.ts` 顶层静态 `import express` / `import cors`。调用点有 `if (BACKGROUND)` 门控，
但**静态导入会被提升**，模块图不受该门控约束——生产启动每次都要加载 express（模块解析本身约 44ms，隔离测得），
而测试服务器只在 `NODE_ENV=development` / `VITE_DEV_SERVER_URL` 存在（即 dev 或 `VIDO_BACKGROUND=1`）时才真正启动。

**修法**：改为 `if (BACKGROUND) { void import('./test-server').then(...) }`。
构建产物随之从「单文件含 express」变为 `index.js`（226B 入口）+ `test-server-*.js`（惰性 chunk，express 只在此）。

## 结果二：dev 与生产的差距

| 阶段 | 生产 | dev（Vite 模块图冷） | dev（Vite 模块图热） |
| --- | --- | --- | --- |
| `app:ready` | +41ms | +74ms | +44ms |
| `window:created` | +117ms | +164ms | +121ms |
| **`renderer:did-finish-load`** | **+78ms** | **+921ms** | **+352ms** |
| `window:ready-to-show` | +8ms | +13ms | +9ms |
| **`total`** | **292ms** | **1260ms** | **576ms** |

dev 的启动成本集中在 `did-finish-load`，即渲染进程加载阶段：**352–921ms vs 生产 78ms（4.5–11.8 倍）**。
原因是 Vite dev 不做打包与压缩、以 ESM 逐模块经 HTTP 提供、附带 HMR 客户端与 source map。
**这一段与 Electron 无关**——换任何运行时，只要仍用 dev server + HMR，同样的相对开销依然存在。

## 对「是否更换运行时」的含义

启动路径的分段（生产，修复后 `total` = 292ms）：

| 分段 | 耗时 | 归属 |
| --- | --- | --- |
| Electron 二进制启动 → 主进程 JS 首行执行 | ~95ms | **Electron 地板** |
| 主进程初始化（IPC/菜单/窗口创建） | ~117ms | 应用代码 |
| 渲染进程加载 | ~78ms | 应用代码 |
| 首帧 → `ready-to-show` | ~8ms | 应用代码 |

- **启动**：约 95ms（33%）是 Electron 原生启动地板，换运行时能省下；其余 ~197ms 是应用自身逻辑，换壳后**仍需重写并重测**。
- **内存**：进程树总 RSS ~390MB，属 Electron 架构地板（见下节分解）。应用自身 JS 堆仅 10.8MB——**内存不在应用代码里**，摘掉 express 那 ~6MB 已是能摘的少数。

## 内存分解（稳态，生产路径）

4 个进程，合计 **389.8MB**：

| 进程 | RSS | 占比 |
| --- | --- | --- |
| main | 181.0MB | 46.4% |
| GPU | 71.8MB | 18.4% |
| Utility/network | 42.4MB | 10.9% |
| Renderer | 94.7MB | 24.3% |

主进程内部分解（3 次采样一致，rss 波动 0.28MB）：

| 组成 | MB | 占 rss |
| --- | --- | --- |
| JS 堆（`heapTotal`，其中 `heapUsed` 6.61） | 10.81 | 5.9% |
| `external` | 2.53 | 1.4% |
| `arrayBuffers` | 0.00 | 0% |
| **未归因残留（原生/映射）** | **170.60** | **92.7%** |

增量链：裸 Node 40.0MB → 空 Electron 模块加载 74.5（+34.5）→ 空 Electron `whenReady` 无窗口 96.5（+22.0）→ **真实 Vido 主进程 183.9（+87.5）**。
主进程代码仅 257 行，那 +87.5MB 是 Chromium **托管一个窗口/渲染进程宿主**的成本，不是应用逻辑。

> 未解决：`ps` RSS（183.4MB）比 `process.getProcessMemoryInfo()` 的 private+shared（79.5MB）高 **103.9MB**，
> 无 vmmap/Instruments 归因。引用"主进程 175MB"时须知该数字有约 104MB 无法解释。

## 包体组成与死重量

| 项 | 大小 |
| --- | --- |
| `Vido.app` 总计 | **239MB** |
| `Contents/Frameworks` | 221MB（**92.5%**） |
| └ `Electron Framework` Mach-O | 140.8MB（**58.9% of app**） |
| `Resources/app.asar` | 18MB |

asar 内容中 `node_modules` 占 16.11MB（91.6%），而经依赖闭包分析——**其中 100% 在运行时从不被读取**：

| 依赖 | 字节 | 为何是死重量 |
| --- | --- | --- |
| `vue` + `@vue/*` + `@babel/*` | 14.64MB | 已被 Vite 打进渲染进程 bundle；主进程无 `vue` 引用 |
| `express` + `cors` + 65 个传递依赖 | 1.33MB | 仅 BACKGROUND 模式经动态 import 需要；生产不加载 |
| `marked` | 0.93MB | 已被打进渲染进程 bundle |

即 **asar 的 91.6%、整包的 6.6% 是从不被读取的依赖**——根因是它们声明在 `dependencies`，而 `vite.config.ts` 对主进程构建 `external: Object.keys(dependencies)`，electron-builder 便把它们全部拷进 asar。
（`express`/`cors` 例外：BACKGROUND 模式确实加载，不能简单移走。）
另：`dist/assets/index-*.js.map`（1.21MB）也被打进包，属生产环境不必要的 source map 外泄面。

## 局限

- 单机单平台（macOS arm64）。Windows / Linux 未测。
- 内存为 RSS 稳态值，非 Chromium 的详细内存分解；主进程另有约 104MB 未归因（见上）。
- dev 数据的两次样本分别来自 Vite 模块图冷 / 热态，仅代表该范围的实测点，未做多次中位数。
- 未测首次冷启动（无 Chromium profile 缓存）与 Gatekeeper 签名校验开销——本包为 ad-hoc 签名、未公证。
- 包体为 APFS `du`/`stat` 值，块记账与 asar 逻辑字节和存在小幅差异。
