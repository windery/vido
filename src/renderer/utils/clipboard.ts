/**
 * 系统剪贴板访问（p/P 粘贴外部复制内容、y 复制写回系统）
 * 优先级：Electron 主进程桥（无权限限制）→ navigator.clipboard → 不可用（null）
 * jsdom/旧环境无任何实现时返回 null，调用方回退内部 yank 缓冲。
 */

interface VidoClipboardBridge {
  readText?: () => Promise<string>;
  writeText?: (text: string) => Promise<boolean>;
}

function bridge(): VidoClipboardBridge | null {
  const w = window as unknown as { vidoClipboard?: VidoClipboardBridge };
  return w.vidoClipboard ?? null;
}

function navClipboard(): { readText?: () => Promise<string>; writeText?: (text: string) => Promise<void> } | null {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      return navigator.clipboard;
    }
  } catch {
    /* best-effort */
  }
  return null;
}

/**
 * 读取系统剪贴板文本。
 * 返回 null = 环境无任何剪贴板能力（同步判定，调用方直接走内部缓冲回退）；
 * 返回 Promise = 异步读取，resolve 文本（读取失败/为空时 resolve ''，调用方再回退）。
 */
export function readSystemClipboard(): Promise<string> | null {
  const b = bridge();
  if (b?.readText) {
    return b.readText().catch(() => '');
  }
  const nav = navClipboard();
  if (nav?.readText) {
    return nav.readText().catch(() => '');
  }
  return null;
}

/** yank/删除块后尽力写回系统剪贴板（失败静默，不影响内部缓冲） */
export function writeSystemClipboard(text: string): void {
  if (!text) return;
  const b = bridge();
  if (b?.writeText) {
    void b.writeText(text).catch(() => {});
    return;
  }
  const nav = navClipboard();
  if (nav?.writeText) {
    void nav.writeText(text).catch(() => {});
  }
}
