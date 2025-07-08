/**
 * 应用状态管理器测试
 * 验证新架构的状态管理逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApplicationStateManager } from '../application-state-manager';
import { EditorMode } from '../../editor';
import { TaskState } from '../../task';
import { StateChangeEvent } from '../../interfaces/observer';

describe('ApplicationStateManager', () => {
  let stateManager: ApplicationStateManager;
  let mockObserver: { update: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    stateManager = new ApplicationStateManager();
    mockObserver = { update: vi.fn() };
    stateManager.subscribe(mockObserver);
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = stateManager.getState();

      expect(state.editorMode).toBe(EditorMode.COMMAND);
      expect(state.taskState).toBe(TaskState.VIEWING);
      expect(state.selectedTaskId).toBeUndefined();
      expect(state.cursorPosition).toBeUndefined();
      expect(state.isHelpVisible).toBe(false);
      expect(state.lastlineContent).toBe('');
      expect(state.lastlineVisible).toBe(false);
    });
  });

  describe('状态转换', () => {
    it('应该正确处理i键转换：COMMAND -> CONTENT_NAVIGATION', () => {
      const result = stateManager.transition('i');

      expect(result.success).toBe(true);
      expect(result.newState?.editorMode).toBe(EditorMode.CONTENT_NAVIGATION);
      expect(result.newState?.taskState).toBe(TaskState.CONTENT_NAVIGATION);
      expect(result.newState?.cursorPosition).toEqual({ line: 0, column: 0 });
    });

    it('应该正确处理第二次i键转换：CONTENT_NAVIGATION -> CONTENT_EDIT', () => {
      // 先转换到CONTENT_NAVIGATION
      stateManager.transition('i');

      // 再转换到CONTENT_EDIT
      const result = stateManager.transition('i');

      expect(result.success).toBe(true);
      expect(result.newState?.editorMode).toBe(EditorMode.CONTENT_EDIT);
      expect(result.newState?.taskState).toBe(TaskState.CONTENT_EDITING);
    });

    it('应该正确处理Escape键退出', () => {
      // 先进入CONTENT_EDIT模式
      stateManager.transition('i');
      stateManager.transition('i');

      // 按Escape退出
      const result = stateManager.transition('Escape');

      expect(result.success).toBe(true);
      expect(result.newState?.editorMode).toBe(EditorMode.CONTENT_NAVIGATION);
      expect(result.newState?.taskState).toBe(TaskState.CONTENT_NAVIGATION);
    });

    it('应该正确处理搜索模式转换', () => {
      const result = stateManager.transition('/');

      expect(result.success).toBe(true);
      expect(result.newState?.editorMode).toBe(EditorMode.LAST_LINE);
      expect(result.newState?.lastlineContent).toBe('/');
      expect(result.newState?.lastlineVisible).toBe(true);
    });

    it('应该正确处理命令模式转换', () => {
      const result = stateManager.transition(':');

      expect(result.success).toBe(true);
      expect(result.newState?.editorMode).toBe(EditorMode.LAST_LINE);
      expect(result.newState?.lastlineContent).toBe(':');
      expect(result.newState?.lastlineVisible).toBe(true);
    });

    it('应该拒绝无效的状态转换', () => {
      const result = stateManager.transition('invalid_key');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('观察者模式', () => {
    it('应该通知观察者状态变化', () => {
      stateManager.transition('i');

      expect(mockObserver.update).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'state-transition',
          trigger: 'i',
          from: {
            editorMode: EditorMode.COMMAND,
          },
          to: {
            editorMode: EditorMode.CONTENT_NAVIGATION,
          },
        })
      );
    });

    it('应该支持取消订阅', () => {
      stateManager.unsubscribe(mockObserver);
      stateManager.transition('i');

      expect(mockObserver.update).not.toHaveBeenCalled();
    });
  });

  describe('上下文操作', () => {
    it('应该正确更新选中的任务', () => {
      stateManager.selectTask(123);

      const state = stateManager.getState();
      expect(state.selectedTaskId).toBe(123);
    });

    it('应该正确更新光标位置', () => {
      stateManager.updateCursorPosition(5, 10);

      const state = stateManager.getState();
      expect(state.cursorPosition).toEqual({ line: 5, column: 10 });
    });

    it('应该正确切换帮助显示', () => {
      stateManager.toggleHelp();

      let state = stateManager.getState();
      expect(state.isHelpVisible).toBe(true);

      stateManager.toggleHelp();
      state = stateManager.getState();
      expect(state.isHelpVisible).toBe(false);
    });

    it('应该正确更新lastline内容', () => {
      stateManager.updateLastlineContent('test content');

      const state = stateManager.getState();
      expect(state.lastlineContent).toBe('test content');
    });
  });

  describe('状态重置', () => {
    it('应该正确重置到初始状态', () => {
      // 先进行一些状态变化
      stateManager.transition('i');
      stateManager.selectTask(123);
      stateManager.updateCursorPosition(5, 10);
      stateManager.toggleHelp();

      // 重置状态
      stateManager.reset();

      // 验证状态已重置
      const state = stateManager.getState();
      expect(state.editorMode).toBe(EditorMode.COMMAND);
      expect(state.taskState).toBe(TaskState.VIEWING);
      expect(state.selectedTaskId).toBeUndefined();
      expect(state.cursorPosition).toBeUndefined();
      expect(state.isHelpVisible).toBe(false);
      expect(state.lastlineContent).toBe('');
      expect(state.lastlineVisible).toBe(false);
    });
  });

  describe('调试信息', () => {
    it('应该提供完整的调试信息', () => {
      const debugInfo = stateManager.getDebugInfo();

      expect(debugInfo.currentState).toBeDefined();
      expect(debugInfo.stateMachineState).toBeDefined();
      expect(debugInfo.observerCount).toBe(1);
    });
  });

  describe('完整的i键工作流程', () => {
    it('应该完整支持i键的两阶段转换', () => {
      // 测试完整i键工作流程

      // 阶段1: COMMAND -> CONTENT_NAVIGATION
      let result = stateManager.transition('i');
      expect(result.success).toBe(true);
      expect(result.newState?.editorMode).toBe(EditorMode.CONTENT_NAVIGATION);
      expect(result.newState?.taskState).toBe(TaskState.CONTENT_NAVIGATION);
      // 第一次i键转换成功

      // 阶段2: CONTENT_NAVIGATION -> CONTENT_EDIT
      result = stateManager.transition('i');
      expect(result.success).toBe(true);
      expect(result.newState?.editorMode).toBe(EditorMode.CONTENT_EDIT);
      expect(result.newState?.taskState).toBe(TaskState.CONTENT_EDITING);
      // 第二次i键转换成功

      // 验证观察者被正确通知
      expect(mockObserver.update).toHaveBeenCalledTimes(2);

      // 完整i键工作流程测试通过
    });
  });
});
