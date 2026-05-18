/**
 * 全局应用状态 Store
 * 组合 TaskListManager + 编辑器模式 + UI 状态
 */

import { reactive } from 'vue';
import { Task } from '../task';
import { TaskList } from '../entities/task-list';
import { TaskListManager } from '../manager/task-list-manager';
import { EditorMode } from '../editor';
import { StateMachine, deriveTaskState } from '../state-machine';
import { logger } from '../../utils/logger';
import { setMaxId } from '../operations/task-crud';

export interface AppState {
  editorMode: EditorMode;
  taskState: number;
  selectedTaskId?: number;
  cursorPosition?: { line: number; column: number };
  lastlineContent: string;
  lastlineVisible: boolean;
  isHelpVisible: boolean;
}

class Store {
  manager: TaskListManager = new TaskListManager();
  state: AppState;
  private sm = new StateMachine();

  constructor() {
    this.state = reactive({
      editorMode: EditorMode.COMMAND,
      taskState: 0,
      selectedTaskId: undefined,
      cursorPosition: undefined,
      lastlineContent: '',
      lastlineVisible: false,
      isHelpVisible: false,
    });
  }

  // ======== 初始化 ========

  async init(): Promise<void> {
    const saved = await TaskListManager.load();
    if (saved) {
      this.manager = saved;
      logger.info('Store', `Loaded ${this.manager.list.items.length} tasks`);
    }
  }

  // ======== 状态转换 ========

  transition(trigger: string, context?: any): { success: boolean; error?: string } {
    const result = this.sm.transition(trigger);
    if (!result.success) return result;

    const newEditorMode = result.transition!.to;
    const hasSelected = this.manager.list.selected !== null;
    const newTaskState = deriveTaskState(newEditorMode, hasSelected);

    this.state.editorMode = newEditorMode;
    this.state.taskState = newTaskState;

    // 同步任务状态
    if (newEditorMode === EditorMode.COMMAND && trigger === 'Escape') {
      this.manager.updateSelectedTaskStatus(newTaskState);
    }

    logger.info('Store', `Transition: ${trigger} → ${EditorMode[newEditorMode]}`);

    if (trigger === ':' || trigger === '/') {
      this.state.lastlineVisible = true;
    }
    if (trigger === 'Enter' && this.state.lastlineVisible) {
      this.state.lastlineVisible = false;
    }
    if (trigger === 'Escape' && this.state.lastlineContent?.startsWith('/')) {
      this.state.lastlineContent = '';
    }

    return { success: true };
  }

  toggleHelp(): void {
    this.state.isHelpVisible = !this.state.isHelpVisible;
  }

  // ======== 任务选择同步 ========

  syncSelection(): void {
    this.state.selectedTaskId = this.manager.list.selected?.id;
  }

  syncCursor(): void {
    const task = this.manager.list.selected;
    if (task) {
      this.state.cursorPosition = { line: task.cursorLine ?? 0, column: task.cursorColumn ?? 0 };
    }
  }
}

export const store = new Store();
