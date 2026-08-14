/**
 * electron-builder afterPack hook：macOS 未签名包做 ad-hoc 签名。
 *
 * 背景：完全未签名的 .app 从网上下载后带 com.apple.quarantine 隔离属性，
 * Gatekeeper 会直接判「已损坏」，且系统设置里不会出现「仍要打开」按钮；
 * ad-hoc 签名后变为「身份不明的开发者」，用户可以右键打开 / 隐私与安全性放行。
 *
 * 实现：手动按 codesign 要求的依赖顺序签名（框架内层 Helper → 框架 →
 * 各 Helper.app → 主应用），保证 `codesign --verify --deep --strict` 通过。
 * 不用 @electron/osx-sign：它在部分 CI runner 上会挂起/静默失败。
 * 仅 darwin；仅当 .app 当前无正式签名（无 TeamIdentifier）时才执行，
 * 配置了 Developer ID 证书时自动让路。
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function sign(target) {
  execFileSync(
    'codesign',
    ['--force', '--sign', '-', '--timestamp=none', target],
    { stdio: 'inherit' }
  );
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );
  if (!fs.existsSync(appPath)) return;

  // universal 构建的 x64/arm64 临时目录（*-x64-temp / *-arm64-temp）不签：
  // 签名会破坏 @electron/universal 的合并；合并后的最终 app 由 afterPack 再次调用时签名
  if (/-(x64|arm64)-temp/.test(context.appOutDir)) {
    console.log(`  • universal 临时架构，跳过签名: ${context.appOutDir}`);
    return;
  }

  // 注意：Electron 官方二进制自带 linker-signed（adhoc）签名，codesign -dv 会成功，
  // 但它没有 bundle 级 _CodeSignature 密封，Gatekeeper 照样判「已损坏」。
  // 因此只以 TeamIdentifier 判断：有真实 Team（正式证书）才让路，其余一律重新 ad-hoc 签名。
  let team = '';
  try {
    const out = execFileSync('codesign', ['-dv', appPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const m = /TeamIdentifier=(.*)/.exec(out);
    team = m ? m[1].trim() : '';
  } catch {
    // 完全未签名 → 需要 ad-hoc
  }
  if (team && team !== 'not set') {
    console.log(`  • 已使用正式证书签名（Team=${team}），跳过 ad-hoc`);
    return;
  }

  console.log(`  • ad-hoc signing (无证书): ${appPath}`);
  const contents = path.join(appPath, 'Contents');
  const frameworksDir = path.join(contents, 'Frameworks');
  const framework = path.join(frameworksDir, 'Electron Framework.framework');
  const versionDir = path.join(framework, 'Versions', 'A');

  // 1) 顶层依赖框架（Mantle / ReactiveObjC / Squirrel 等，先签被依赖方）
  if (fs.existsSync(frameworksDir)) {
    for (const f of fs.readdirSync(frameworksDir)) {
      if (f.endsWith('.framework') && f !== 'Electron Framework.framework') {
        sign(path.join(frameworksDir, f));
      }
    }
  }
  // 2) Electron Framework 内层 Helper（chrome_crashpad_handler 等）
  const helpersDir = path.join(versionDir, 'Helpers');
  if (fs.existsSync(helpersDir)) {
    for (const f of fs.readdirSync(helpersDir)) {
      sign(path.join(helpersDir, f));
    }
  }
  // 3) Electron Framework.framework 本体
  if (fs.existsSync(framework)) sign(framework);
  // 4) 各 Helper.app（Vido Helper / GPU / Plugin / Renderer）
  if (fs.existsSync(frameworksDir)) {
    for (const f of fs.readdirSync(frameworksDir)) {
      if (f.endsWith('.app')) sign(path.join(frameworksDir, f));
    }
  }
  // 5) 主应用（最后签名，密封整个 bundle）
  sign(appPath);
};
