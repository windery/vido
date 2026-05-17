import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentNavigationModeHandler } from '../keyboard/content-navigation-mode-handler';

function makeEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true });
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
      status: 4, // CONTENT_NAVIGATION
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

  describe('Escape', () => {
    it('transitions out of content navigation', () => {
      handler.handleKey(makeEvent('Escape'), 'Escape', mockTDM, false);
      expect(mockTDM.transition).toHaveBeenCalledWith('Escape');
    });
  });
});
