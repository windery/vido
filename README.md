# Vido

A todolist App for vimers. 全 vim 键位操作，终端极客审美。

## Develop

```bash
pnpm install
pnpm dev          # Vite + Electron，HMR
pnpm test         # 全部测试
pnpm typecheck    # vue-tsc
```

## 打包（全平台 / 全架构）

支持矩阵：**macOS x64 / arm64 / universal**（dmg + zip）、**Windows x64 / arm64**（NSIS 安装包 + zip 免安装）、**Linux x64 / arm64**（AppImage + deb）。

### 一键出全部平台（推荐）

推送 `v*` 标签（如 `v0.2.0`）触发 GitHub Actions，自动构建全部平台/架构并发布到 GitHub Release；也可在 Actions 页手动 `workflow_dispatch`。见 `.github/workflows/release.yml`。

### 本地构建（按需）

```bash
pnpm build                  # 当前平台 + 当前架构（含 typecheck）
pnpm build:mac              # macOS，当前架构（dmg + zip）
pnpm build:mac:arm64        # macOS Apple Silicon
pnpm build:mac:x64          # macOS Intel
pnpm build:mac:universal    # macOS 双架构合一包（x64+arm64）
pnpm build:win              # Windows x64 + arm64（安装包 + zip）
pnpm build:linux            # Linux x64 + arm64（AppImage + deb）
pnpm build:unpack           # 只出未打包目录（快速冒烟验证）
```

产物在 `release/<version>/`，命名 `Vido-<平台>-<架构>-<版本>.<ext>`。
（Linux x64 遵循发行版惯例：AppImage 用 `x86_64`、deb 用 `amd64`；arm64 全部统一为 `arm64`。）

**平台限制**（本地单机交叉构建的固有限制）：
- macOS 上构建 Windows：需要 Wine（`brew install --cask wine-stable`）来写 exe 资源/图标；缺 Wine 会报错 → 直接走 CI 最省事。
- macOS 上不能构建 Linux 目标（electron-builder 限制）→ 用 Linux 机器 / Docker / CI。

**签名与分发**：
- 默认出**未签名**包（本地与 CI 都设 `CSC_IDENTITY_AUTO_DISCOVERY=false`）。
- **macOS 包自动做 ad-hoc 签名**（`scripts/after-pack-adhoc-sign.cjs`）：未签名应用被 Gatekeeper 判「已损坏」且无「仍要打开」按钮；ad-hoc 签名后变为「无法验证开发者」，可右键打开或到 系统设置 → 隐私与安全性 → 仍要打开 放行。
- 正式分发：配置 Apple Developer ID 证书（自动跳过 ad-hoc，不覆盖正式签名），macOS 建议走 notarize（Apple 公证），并把 `electron-builder.json5` 里 `mac.hardenedRuntime` 改回 `true`。
- Windows 图标由 `build/icon.png`（1024×1024）自动转 `ico`，不要手动指向不存在的 `build/icon.ico`。

### macOS 安装提示

下载的 dmg 带隔离属性，首次打开可能提示「无法验证开发者」：

1. 右键 Vido.app → 打开 → 再点「打开」；或
2. 系统设置 → 隐私与安全性 → 拉到「安全性」→ 仍要打开；或
3. 若个别环境仍提示「已损坏」（老版本未签名包）：终端执行
   ```bash
   xattr -cr /Applications/Vido.app
   ```
   移除下载隔离属性后即可正常打开。

**国内加速**：下载 Electron 慢时设置镜像：
```bash
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
```

## Vue DevTools

```bash
./node_modules/.bin/vue-devtools
```
