/**
 * electron-builder afterPack hook：macOS 未签名包做 ad-hoc 签名。
 *
 * 背景：完全未签名的 .app 从网上下载后带 com.apple.quarantine 隔离属性，
 * Gatekeeper 会直接判「已损坏」，且系统设置里不会出现「仍要打开」按钮；
 * ad-hoc 签名后变为「身份不明的开发者」，用户可以右键打开 / 隐私与安全性放行。
 *
 * 实现：用 @electron/osx-sign（Electron 官方签名工具，按框架→Helper→主程序
 * 的正确顺序签名，保证 codesign --verify 通过）。仅 darwin；仅当 .app 当前
 * 无有效签名时才 ad-hoc 签名，配置了正式证书（Developer ID）时自动让路。
 */
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const osxSign = require('@electron/osx-sign');

function signAsync(options) {
  return new Promise((resolve, reject) => {
    osxSign.sign(options, (err) => (err ? reject(err) : resolve()));
  });
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );

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
  await signAsync({
    app: appPath,
    platform: 'darwin',
    identity: '-',
    identityValidation: false,
    hardenedRuntime: false,
    'gatekeeper-assess': false,
  });
};
