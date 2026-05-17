import { describe, it, expect, beforeEach } from 'vitest';
import { StateMachine } from '../state-machine';
import { EditorMode } from '../editor';

describe('StateMachine', () => {
  let sm: StateMachine;

  beforeEach(() => {
    sm = new StateMachine();
  });

  describe('initial state', () => {
    it('starts in COMMAND mode', () => {
      expect(sm.getCurrentState().editorMode).toBe(EditorMode.COMMAND);
    });
  });

  describe('COMMAND mode transitions', () => {
    it(': enters LAST_LINE', () => {
      const result = sm.transition(':');
      expect(result.success).toBe(true);
      expect(sm.getCurrentState().editorMode).toBe(EditorMode.LAST_LINE);
    });

    it('/ enters LAST_LINE', () => {
      const result = sm.transition('/');
      expect(result.success).toBe(true);
      expect(sm.getCurrentState().editorMode).toBe(EditorMode.LAST_LINE);
    });

    it('i enters CONTENT_NAVIGATION', () => {
      const result = sm.transition('i');
      expect(result.success).toBe(true);
      expect(sm.getCurrentState().editorMode).toBe(EditorMode.CONTENT_NAVIGATION);
    });

    it('Enter enters TITLE_EDIT', () => {
      const result = sm.transition('Enter');
      expect(result.success).toBe(true);
      expect(sm.getCurrentState().editorMode).toBe(EditorMode.TITLE_EDIT);
    });

    it('Escape stays in COMMAND', () => {
      const result = sm.transition('Escape');
      expect(result.success).toBe(true);
      expect(sm.getCurrentState().editorMode).toBe(EditorMode.COMMAND);
    });
  });

  describe('LAST_LINE mode transitions', () => {
    beforeEach(() => {
      sm.transition(':');
    });

    it('Enter returns to COMMAND', () => {
      const result = sm.transition('Enter');
      expect(result.success).toBe(true);
      expect(sm.getCurrentState().editorMode).toBe(EditorMode.COMMAND);
    });

    it('Escape returns to COMMAND', () => {
      const result = sm.transition('Escape');
      expect(result.success).toBe(true);
      expect(sm.getCurrentState().editorMode).toBe(EditorMode.COMMAND);
    });
  });

  describe('TITLE_EDIT mode transitions', () => {
    beforeEach(() => {
      sm.transition('Enter');
    });

    it('Enter returns to COMMAND', () => {
      const result = sm.transition('Enter');
      expect(result.success).toBe(true);
      expect(sm.getCurrentState().editorMode).toBe(EditorMode.COMMAND);
    });

    it('Escape returns to COMMAND', () => {
      const result = sm.transition('Escape');
      expect(result.success).toBe(true);
      expect(sm.getCurrentState().editorMode).toBe(EditorMode.COMMAND);
    });
  });

  describe('CONTENT_NAVIGATION mode transitions', () => {
    beforeEach(() => {
      sm.transition('i');
    });

    it('i enters CONTENT_EDIT', () => {
      const result = sm.transition('i');
      expect(result.success).toBe(true);
      expect(sm.getCurrentState().editorMode).toBe(EditorMode.CONTENT_EDIT);
    });

    it('Escape returns to COMMAND', () => {
      const result = sm.transition('Escape');
      expect(result.success).toBe(true);
      expect(sm.getCurrentState().editorMode).toBe(EditorMode.COMMAND);
    });
  });

  describe('invalid transitions', () => {
    it('rejects unknown trigger', () => {
      const result = sm.transition('x');
      expect(result.success).toBe(false);
    });

    it('rejects j in COMMAND mode', () => {
      const result = sm.transition('j');
      expect(result.success).toBe(false);
    });
  });

  describe('available triggers', () => {
    it('lists valid triggers for COMMAND mode', () => {
      const triggers = sm.getAvailableTriggers();
      expect(triggers).toContain('i');
      expect(triggers).toContain(':');
      expect(triggers).toContain('Enter');
      // 'cc' no longer transitions to TASK_CONFIG mode
    });
  });
});
