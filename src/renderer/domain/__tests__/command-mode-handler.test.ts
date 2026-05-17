import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandModeHandler } from '../keyboard/command-mode-handler';

function makeEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true });
}

describe('CommandModeHandler', () => {
  let handler: CommandModeHandler;
  let mockTDM: any;

  beforeEach(() => {
    handler = new CommandModeHandler();

    mockTDM = {
      getState: vi.fn(() => ({
        editorMode: 0,
        selectedTaskId: 1,
        lastlineContent: '',
        isHelpVisible: false,
      })),
      selectNext: vi.fn(),
      selectPrevious: vi.fn(),
      goToFirst: vi.fn(),
      goToLast: vi.fn(),
      transition: vi.fn(() => ({ success: true })),
      startContentNavigation: vi.fn(),
      startTitleEditing: vi.fn(),
      toggleTaskCompletion: vi.fn(),
      toggleHelp: vi.fn(),
      createNewTask: vi.fn(() => ({ id: 99, title: '' })),
      deleteSelectedTask: vi.fn(),
      copySelectedTask: vi.fn(),
      pasteTask: vi.fn(),
      showTaskConfig: vi.fn(),
    };
  });

  describe('basic navigation', () => {
    it('calls selectNext on j', () => {
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      expect(mockTDM.selectNext).toHaveBeenCalledTimes(1);
    });

    it('calls selectPrevious on k', () => {
      handler.handleKey(makeEvent('k'), 'k', mockTDM, false);
      expect(mockTDM.selectPrevious).toHaveBeenCalledTimes(1);
    });

    it('calls goToLast on G', () => {
      handler.handleKey(makeEvent('G'), 'G', mockTDM, false);
      expect(mockTDM.goToLast).toHaveBeenCalledTimes(1);
    });
  });

  describe('number prefix', () => {
    it('repeats selectNext 3 times with 3j', () => {
      handler.handleKey(makeEvent('3'), '3', mockTDM, false);
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      expect(mockTDM.selectNext).toHaveBeenCalledTimes(3);
    });

    it('repeats selectPrevious 5 times with 5k', () => {
      handler.handleKey(makeEvent('5'), '5', mockTDM, false);
      handler.handleKey(makeEvent('k'), 'k', mockTDM, false);
      expect(mockTDM.selectPrevious).toHaveBeenCalledTimes(5);
    });

    it('resets count after execution', () => {
      handler.handleKey(makeEvent('3'), '3', mockTDM, false);
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      expect(mockTDM.selectNext).toHaveBeenCalledTimes(3);

      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      expect(mockTDM.selectNext).toHaveBeenCalledTimes(4); // +1 more
    });

    it('handles multi-digit prefix 12j', () => {
      handler.handleKey(makeEvent('1'), '1', mockTDM, false);
      handler.handleKey(makeEvent('2'), '2', mockTDM, false);
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      expect(mockTDM.selectNext).toHaveBeenCalledTimes(12);
    });

    it('2dd deletes twice', () => {
      handler.handleKey(makeEvent('2'), '2', mockTDM, false);
      handler.handleKey(makeEvent('d'), 'd', mockTDM, false);
      handler.handleKey(makeEvent('d'), 'd', mockTDM, false);
      expect(mockTDM.deleteSelectedTask).toHaveBeenCalledTimes(2);
    });

    it('ignores digit not starting a sequence (e.g. single 0)', () => {
      // '0' is not in [1-9] regex range — but wait, let me check: 0 is not a valid count prefix in vim
      handler.handleKey(makeEvent('0'), '0', mockTDM, false);
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      expect(mockTDM.selectNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('key sequences', () => {
    it('gg goes to first task', () => {
      handler.handleKey(makeEvent('g'), 'g', mockTDM, false);
      handler.handleKey(makeEvent('g'), 'g', mockTDM, false);
      expect(mockTDM.goToFirst).toHaveBeenCalledTimes(1);
    });

    it('dd deletes selected task', () => {
      handler.handleKey(makeEvent('d'), 'd', mockTDM, false);
      handler.handleKey(makeEvent('d'), 'd', mockTDM, false);
      expect(mockTDM.deleteSelectedTask).toHaveBeenCalledTimes(1);
    });

    it('yy copies selected task', () => {
      handler.handleKey(makeEvent('y'), 'y', mockTDM, false);
      handler.handleKey(makeEvent('y'), 'y', mockTDM, false);
      expect(mockTDM.copySelectedTask).toHaveBeenCalledTimes(1);
    });

    it('cc shows task config', () => {
      handler.handleKey(makeEvent('c'), 'c', mockTDM, false);
      handler.handleKey(makeEvent('c'), 'c', mockTDM, false);
      expect(mockTDM.showTaskConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe('scroll callback', () => {
    it('calls injected scroll callback after navigation', async () => {
      const scrollCb = vi.fn();
      handler.setScrollCallback(scrollCb);
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      // scroll happens after setTimeout(10ms)
      await new Promise((r) => setTimeout(r, 20));
      expect(scrollCb).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('clears all state', () => {
      handler.handleKey(makeEvent('3'), '3', mockTDM, false);
      handler.handleKey(makeEvent('g'), 'g', mockTDM, false);
      handler.dispose();
      // After dispose, new key should work as fresh (no residual count/sequence)
      handler.setScrollCallback(vi.fn());
      handler.handleKey(makeEvent('j'), 'j', mockTDM, false);
      expect(mockTDM.selectNext).toHaveBeenCalledTimes(1);
    });
  });
});
