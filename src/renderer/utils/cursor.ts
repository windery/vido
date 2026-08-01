/**
 * 计算内容导航模式下的选区范围，用于显示 vim 风格块光标。
 * 对齐设计源 vido.html applyCursorUI：
 * - 行非空且光标不在行尾 → 选中当前字符 [col, col+1]
 * - 行非空且光标在行尾 → 选中行尾字符 [len-1, len]
 * - 行空 → 折叠光标 [offset, offset]
 *
 * @param offset 光标所在行的行首字符偏移（不含 col）
 * @param cursorCol 光标列（已 clamp 到行文本长度）
 * @param lineText 光标所在行的文本
 */
export function computeNavSelection(
  offset: number,
  cursorCol: number,
  lineText: string
): [number, number] {
  const len = lineText.length;
  if (len === 0) return [offset, offset];
  if (cursorCol >= len) return [offset + len - 1, offset + len];
  return [offset + cursorCol, offset + cursorCol + 1];
}
