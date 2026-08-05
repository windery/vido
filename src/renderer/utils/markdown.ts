/**
 * Markdown 渲染（内容区 normal 模式）。
 *
 * 高度一致性关键：textarea（nav/edit 态）逐行显示（空行占一行高），
 * marked 默认把空行折叠为段落边界 → 切换模式时内容区高度跳动。
 * 预处理：普通文本间的空行替换为等量 <br>（N 个 \n = N 个 <br>）占位，
 * 与编辑态逐行对齐；块级语法（列表/引用/标题）前后的空行保留段落语义。
 */
import { marked } from 'marked';

/** 块级语法行判定（列表/引用/标题/代码块/分割线等） */
export function isBlockLine(line: string): boolean {
    return (
        /^\s*[-#>|`*~]/.test(line) ||
        /^\s*\d+[.)]\s/.test(line) ||
        /^\s*#{1,6}\s/.test(line) ||
        /^\s*([-*_])\1{2,}\s*$/.test(line)
    );
}

/** 渲染 markdown：空行保留 + 块级标签间空白清理（pre-wrap 下多余空行） */
export function renderMarkdown(content: string): string {
    const preserved = content.replace(/\n\n+/g, (m, offset) => {
        const before = content.slice(0, offset);
        const after = content.slice(offset + m.length);
        const prevLine = before.split('\n').filter(Boolean).pop() ?? '';
        const nextLine = after.split('\n').find((l) => l.trim() !== '') ?? '';
        return isBlockLine(prevLine) || isBlockLine(nextLine) ? m : '<br>'.repeat(m.length);
    });
    const result = marked(preserved);
    const html = typeof result === 'string' ? result : result.toString();
    return html.replace(/>\s+</g, '><').trim();
}
