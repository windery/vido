import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentNavigationModeHandler } from '../keyboard/content-navigation-mode-handler';
import { readSystemClipboard } from '../../utils/clipboard';

// jsdom 无 navigator.clipboard：默认 null → p/P 回退内部 yank 缓冲
vi.mock('../../utils/clipboard', () => ({
  readSystemClipboard: vi.fn(() => null),
  writeSystemClipboard: vi.fn(),
}));

function makeEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true });
}

function makeCtrlEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true });
}

describe('ContentNavigationModeHandler', () => {
  let handler: ContentNavigationModeHandler;
  let mockTDM: any;
  let cursorLine: number;
  let cursorCol: number;
  let selectedTask: any;

  beforeEach(() => {
    handler = new ContentNavigationModeHandler();

    selectedTask = {
      id: 1,
      content: '',
      selected: true,
      status: 2, // TaskState.CONTENT_NAVIGATION
      cursorLine: 0,
      cursorColumn: 0,
    };

    cursorLine = 0;
    cursorCol = 0;

    mockTDM = {
      getState: () => ({
        editorMode: 4, // CONTENT_NAVIGATION
        selectedTaskId: 1,
        tasks: [selectedTask],
      }),
      getTaskDataState: () => ({
        editorMode: 4,
        selectedTaskId: 1,
        tasks: [selectedTask],
        isHelpVisible: false,
        lastlineContent: '',
        lastlineVisible: false,
      }),
      transition: vi.fn(() => ({ success: true })),
      toggleHelp: vi.fn(),
      moveCursorUp: vi.fn(),
      moveCursorDown: vi.fn(),
      moveCursorLeft: vi.fn(),
      moveCursorRight: vi.fn(),
      moveCursorToLineStart: vi.fn(),
      moveCursorToLineEnd: vi.fn(),
      moveCursorToFirstLine: vi.fn(),
      moveCursorToLastLine: vi.fn(),
      moveCursorWordForward: vi.fn(),
      moveCursorWordBackward: vi.fn(),
      moveCursorWordEnd: vi.fn(),
      updateTaskCursorPosition: vi.fn((taskId, line, col) => {
        cursorLine = line;
        cursorCol = col;
      }),
      insertNewLineBelow: vi.fn(),
      startVisual: vi.fn(),
      endVisual: vi.fn(),
      deleteVisual: vi.fn(),
      copyVisual: vi.fn(),
      changeVisual: vi.fn(),
      pasteAfter: vi.fn(),
      pasteBefore: vi.fn(),
      pasteTextRaw: vi.fn(),
      replaceVisual: vi.fn(),
      getContentClipboard: vi.fn(() => null),
      undo: vi.fn(),
    };
  });

  describe('a — append (enter edit mode with cursor moved right)', () => {
    it('transitions to CONTENT_EDIT mode', () => {
      handler.handleKey(makeEvent('a'), 'a', mockTDM, false);
      expect(mockTDM.transition).toHaveBeenCalledWith('a');
    });

    it('moves cursor one position right for append', () => {
      selectedTask.content = 'hello';
      selectedTask.cursorColumn = 0;

      handler.handleKey(makeEvent('a'), 'a', mockTDM, false);

      expect(cursorLine).toBe(0);
      expect(cursorCol).toBe(1); // moved from 0 to 1
    });

    it('stays at line end when already at end of line', () => {
      selectedTask.content = 'hi';
      selectedTask.cursorColumn = 2; // at end of 'hi'

      handler.handleKey(makeEvent('a'), 'a', mockTDM, false);

      expect(cursorLine).toBe(0);
      expect(cursorCol).toBe(2); // stays at end
    });

    it('moves cursor right from middle of word', () => {
      selectedTask.content = 'hello world';
      selectedTask.cursorColumn = 4; // on 'o' before space

      handler.handleKey(makeEvent('a'), 'a', mockTDM, false);

      expect(cursorCol).toBe(5); // moved to space position
    });
  });

  describe('i — insert (enter edit mode at current position)', () => {
    it('transitions to CONTENT_EDIT mode', () => {
      handler.handleKey(makeEvent('i'), 'i', mockTDM, false);
      expect(mockTDM.transition).toHaveBeenCalledWith('i');
    });

    it('does NOT move cursor position (inserts at current position)', () => {
      selectedTask.content = 'hello';
      selectedTask.cursorColumn = 2;

      handler.handleKey(makeEvent('i'), 'i', mockTDM, false);

      // i doesn't call updateTaskCursorPosition — inserts where cursor is
      expect(mockTDM.updateTaskCursorPosition).not.toHaveBeenCalled();
    });
  });

  describe('navigation keys', () => {
    it('calls moveCursorUp on k', () => {
      handler.handleKey(makeEvent('k'), 'k', mockTDM, false);
      expect(mockTDM.moveCursorUp).toHaveBeenCalledTimes(1);
    });

    it('calls moveCursorDown on j', () => {
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      expect(mockTDM.moveCursorDown).toHaveBeenCalledTimes(1);
    });

    it('calls moveCursorLeft on h', () => {
      handler.handleKey(makeEvent('h'), 'h', mockTDM, false);
      expect(mockTDM.moveCursorLeft).toHaveBeenCalledTimes(1);
    });

    it('calls moveCursorRight on l', () => {
      handler.handleKey(makeEvent('l'), 'l', mockTDM, false);
      expect(mockTDM.moveCursorRight).toHaveBeenCalledTimes(1);
    });
  });

  describe('word navigation', () => {
    it('calls moveCursorWordForward on w', () => {
      handler.handleKey(makeEvent('w'), 'w', mockTDM, false);
      expect(mockTDM.moveCursorWordForward).toHaveBeenCalledTimes(1);
    });

    it('calls moveCursorWordBackward on b', () => {
      handler.handleKey(makeEvent('b'), 'b', mockTDM, false);
      expect(mockTDM.moveCursorWordBackward).toHaveBeenCalledTimes(1);
    });

    it('calls moveCursorWordEnd on e', () => {
      handler.handleKey(makeEvent('e'), 'e', mockTDM, false);
      expect(mockTDM.moveCursorWordEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('line boundaries', () => {
    it('calls moveCursorToLineStart on 0', () => {
      handler.handleKey(makeEvent('0'), '0', mockTDM, false);
      expect(mockTDM.moveCursorToLineStart).toHaveBeenCalledTimes(1);
    });

    it('calls moveCursorToLineEnd on $', () => {
      handler.handleKey(makeEvent('$'), '$', mockTDM, false);
      expect(mockTDM.moveCursorToLineEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('scenario: navigate then append', () => {
    it('navigate right then a positions cursor correctly', () => {
      // 模拟用户在 "信息搜集" 中按 l 右移光标，再按 a 追加
      selectedTask.content = '信息搜集';
      selectedTask.cursorLine = 0;
      selectedTask.cursorColumn = 1; // 光标在 "信" 后面

      // 按 l 右移
      handler.handleKey(makeEvent('l'), 'l', mockTDM, false);
      expect(mockTDM.moveCursorRight).toHaveBeenCalledTimes(1);

      // 手动把 mock 里的光标位置也更新一下（模拟 moveCursorRight 的效果）
      selectedTask.cursorColumn = 2; // 光标移到 "息" 前面（位置 2）

      // 按 a 进入编辑
      handler.handleKey(makeEvent('a'), 'a', mockTDM, false);

      // a 应该把光标移到位置 3（append：在 "息" 后面插入）
      expect(cursorLine).toBe(0);
      expect(cursorCol).toBe(3);
    });

    it('a at end of line does not move past content', () => {
      selectedTask.content = 'hi';
      selectedTask.cursorLine = 0;
      selectedTask.cursorColumn = 2; // at end

      handler.handleKey(makeEvent('a'), 'a', mockTDM, false);

      expect(cursorCol).toBe(2); // stays at end
    });

    it('multiple lines: a moves cursor right within same line', () => {
      selectedTask.content = 'line1\nline2\nline3';
      selectedTask.cursorLine = 1;
      selectedTask.cursorColumn = 2; // on 'n' of 'line2'

      handler.handleKey(makeEvent('a'), 'a', mockTDM, false);

      expect(cursorLine).toBe(1);
      expect(cursorCol).toBe(3); // after 'n', before 'e2'
    });
  });

  describe('Escape', () => {
    it('transitions out of content navigation', () => {
      handler.handleKey(makeEvent('Escape'), 'Escape', mockTDM, false);
      expect(mockTDM.transition).toHaveBeenCalledWith('Escape');
    });
  });

  describe('? — 打开完整键位参考（不退出导航）', () => {
    it('calls toggleHelp', () => {
      handler.handleKey(makeEvent('?'), '?', mockTDM, false);
      expect(mockTDM.toggleHelp).toHaveBeenCalledWith('content');
    });

    it('does not transition out of navigation', () => {
      handler.handleKey(makeEvent('?'), '?', mockTDM, false);
      expect(mockTDM.transition).not.toHaveBeenCalled();
    });
  });

  describe('Enter — vim normal 语义：下移一行，不退出导航', () => {
    it('calls moveCursorDown', () => {
      handler.handleKey(makeEvent('Enter'), 'Enter', mockTDM, false);
      expect(mockTDM.moveCursorDown).toHaveBeenCalled();
    });

    it('does not transition out of navigation', () => {
      handler.handleKey(makeEvent('Enter'), 'Enter', mockTDM, false);
      expect(mockTDM.transition).not.toHaveBeenCalled();
    });
  });

  describe('v/V/Ctrl+V 可视模式', () => {
    function makeBlockTDM(): any {
      return {
        ...mockTDM,
        getState: () => ({
          editorMode: 4,
          selectedTaskId: 1,
          tasks: [selectedTask],
          visual: { active: true, kind: 'block', anchorLine: 0, anchorCol: 0 },
        }),
      };
    }

    it('Ctrl+V 进块模式、v 进字符可视、V 进行可视（绝不退出导航）', () => {
      handler.handleKey(makeCtrlEvent('v'), 'v', mockTDM, false);
      expect(mockTDM.startVisual).toHaveBeenLastCalledWith('block');
      handler.handleKey(makeEvent('v'), 'v', mockTDM, false);
      expect(mockTDM.startVisual).toHaveBeenLastCalledWith('char');
      handler.handleKey(makeEvent('V'), 'V', mockTDM, false);
      expect(mockTDM.startVisual).toHaveBeenLastCalledWith('line');
      expect(mockTDM.transition).not.toHaveBeenCalled();
    });

    it('块模式内 Esc 只退出块，不退出导航', () => {
      handler.handleKey(makeEvent('Escape'), 'Escape', makeBlockTDM(), false);
      expect(mockTDM.endVisual).toHaveBeenCalled();
      expect(mockTDM.transition).not.toHaveBeenCalled();
    });

    it('块模式内 x/d 删除块、y 复制块', () => {
      handler.handleKey(makeEvent('x'), 'x', makeBlockTDM(), false);
      expect(mockTDM.deleteVisual).toHaveBeenCalledTimes(1);

      handler.handleKey(makeEvent('d'), 'd', makeBlockTDM(), false);
      expect(mockTDM.deleteVisual).toHaveBeenCalledTimes(2);

      handler.handleKey(makeEvent('y'), 'y', makeBlockTDM(), false);
      expect(mockTDM.copyVisual).toHaveBeenCalledTimes(1);
    });

    it('块模式内 c 删除块后进入插入', () => {
      handler.handleKey(makeEvent('c'), 'c', makeBlockTDM(), false);
      expect(mockTDM.changeVisual).toHaveBeenCalled();
      expect(mockTDM.transition).toHaveBeenCalledWith('i');
    });

    it('块模式内移动键扩展选区（放行主 switch，不删块）', () => {
      handler.handleKey(makeEvent('j'), 'j', makeBlockTDM(), false);
      expect(mockTDM.moveCursorDown).toHaveBeenCalled();
      expect(mockTDM.deleteVisual).not.toHaveBeenCalled();
    });

    it('块模式内未绑定键：退出块后按普通键继续', () => {
      handler.handleKey(makeEvent('u'), 'u', makeBlockTDM(), false);
      expect(mockTDM.endVisual).toHaveBeenCalled();
      expect(mockTDM.undo).toHaveBeenCalled(); // 退出块后 u 正常撤销
    });

    it('块模式内 ? 打开内容键位帮助', () => {
      handler.handleKey(makeEvent('?'), '?', makeBlockTDM(), false);
      expect(mockTDM.toggleHelp).toHaveBeenCalledWith('content');
    });

    it('块模式内 p/P 用粘贴内容替换块（系统剪贴板优先，回退内部 yank）', async () => {
      handler.handleKey(makeEvent('p'), 'p', makeBlockTDM(), false);
      expect(mockTDM.replaceVisual).toHaveBeenCalledWith(''); // 无系统剪贴板 + 空内部缓冲 → 仅删除

      (readSystemClipboard as any).mockReturnValueOnce(Promise.resolve('外部文本'));
      handler.handleKey(makeEvent('P'), 'P', makeBlockTDM(), false);
      await new Promise((r) => setTimeout(r, 0));
      expect(mockTDM.replaceVisual).toHaveBeenCalledWith('外部文本');
    });
  });

  describe('p / P — 系统剪贴板优先粘贴', () => {
    it('无系统剪贴板能力：回退内部 yank 缓冲', () => {
      handler.handleKey(makeEvent('p'), 'p', mockTDM, false);
      expect(mockTDM.pasteAfter).toHaveBeenCalledTimes(1);

      handler.handleKey(makeEvent('P'), 'P', mockTDM, false);
      expect(mockTDM.pasteBefore).toHaveBeenCalledTimes(1);
    });

    it('系统剪贴板有文本：p 粘贴该文本', async () => {
      (readSystemClipboard as any).mockReturnValueOnce(Promise.resolve('外部复制文本'));
      handler.handleKey(makeEvent('p'), 'p', mockTDM, false);
      await new Promise((r) => setTimeout(r, 0));
      expect(mockTDM.pasteTextRaw).toHaveBeenCalledWith('外部复制文本', false);
      expect(mockTDM.pasteAfter).not.toHaveBeenCalled();
    });

    it('系统剪贴板为空：回退内部 yank 缓冲', async () => {
      (readSystemClipboard as any).mockReturnValueOnce(Promise.resolve(''));
      handler.handleKey(makeEvent('P'), 'P', mockTDM, false);
      await new Promise((r) => setTimeout(r, 0));
      expect(mockTDM.pasteBefore).toHaveBeenCalledTimes(1);
    });

    it('系统剪贴板读取失败：回退内部 yank 缓冲', async () => {
      (readSystemClipboard as any).mockReturnValueOnce(Promise.reject(new Error('denied')));
      handler.handleKey(makeEvent('p'), 'p', mockTDM, false);
      await new Promise((r) => setTimeout(r, 0));
      expect(mockTDM.pasteAfter).toHaveBeenCalledTimes(1);
    });
  });
});
