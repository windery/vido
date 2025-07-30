/**
 * 任务数据管理器 - 重构为协调器模式
 * 协调各个专门的管理器来处理不同的功能
 */

import { Task, TaskState } from '../task';
import { ApplicationStateManager } from './application-state-manager';
import { ApplicationState } from '../interfaces/observer';
import { EditorMode } from '../editor';

// 导入各个专门的管理器
import { TaskOperations } from './task-operations';
import { CursorManager } from './cursor-manager';
import { DataPersistence } from './data-persistence';
import { TaskNavigation } from './task-navigation';
import { TaskSelectionManager } from './task-selection-manager';
import { TaskEditingManager } from './task-editing-manager';
import { TaskCrudManager } from './task-crud-manager';
import { TaskQueryManager } from './task-query-manager';
import { logger } from '@utils/logger';

export interface TaskDataState extends ApplicationState {
  tasks: Task[];
  maxId: number;
  clipboard: Task | null;
  isTaskConfigVisible: boolean;
}

export class TaskDataManager extends ApplicationStateManager {
  // 专门的管理器实例
  private taskOperations: TaskOperations;
  private cursorManager: CursorManager;
  private dataPersistence: DataPersistence;
  private taskNavigation: TaskNavigation;
  private taskSelection: TaskSelectionManager;
  private taskEditing: TaskEditingManager;
  private taskCrud: TaskCrudManager;
  private taskQuery: TaskQueryManager;

  constructor(initialState?: Partial<TaskDataState>) {
    const defaultTaskState: TaskDataState = {
      // 继承ApplicationState默认值
      editorMode: 0, // EditorMode.COMMAND
      taskState: 0, // TaskState.VIEWING
      selectedTaskId: undefined,
      cursorPosition: undefined,
      isHelpVisible: false,
      lastlineContent: '',
      lastlineVisible: false,
      // 添加任务管理相关状态
      tasks: [],
      maxId: 1,
      clipboard: null,
      isTaskConfigVisible: false,
      ...initialState,
    };

    super(defaultTaskState);

    // 初始化各个管理器
    this.taskOperations = new TaskOperations(
      () => this.getTaskDataState(),
      (updates) => this.updateState(updates, 'TaskOperations')
    );
    this.cursorManager = new CursorManager(
      () => this.getTaskDataState(),
      (updates) => this.updateState(updates, 'CursorManager'),
      (trigger, context) => this.transition(trigger, context)
    );
    this.dataPersistence = new DataPersistence(
      () => this.getTaskDataState(),
      (updates) => this.updateState(updates, 'DataPersistence')
    );
    this.taskNavigation = new TaskNavigation(
      () => this.getTaskDataState(),
      (updates) => this.updateState(updates, 'TaskNavigation')
    );
    this.taskSelection = new TaskSelectionManager(
      () => this.getTaskDataState(),
      (updates) => this.updateState(updates, 'TaskSelection')
    );
    this.taskEditing = new TaskEditingManager(
      () => this.getTaskDataState(),
      (updates) => this.updateState(updates, 'TaskEditing')
    );
    this.taskCrud = new TaskCrudManager(
      () => this.getTaskDataState(),
      (updates) =>
        this.updateState(updates as Partial<TaskDataState>, 'TaskCrud')
    );
    this.taskQuery = new TaskQueryManager(() => this.getTaskDataState());
  }

  // 类型安全的状态获取器
  getTaskDataState(): TaskDataState {
    return this.getState() as TaskDataState;
  }

  /**
   * 任务基础操作 - 委托给TaskCrudManager
   */
  generateId(): number {
    return this.taskCrud.generateId();
  }

  addTask(task: Task): void {
    this.taskCrud.addTask(task);
  }

  removeTask(taskId: number): void {
    this.taskCrud.removeTask(taskId);
  }

  /**
   * 任务选择操作
   */
  selectTask(taskId: number): void {
    this.taskSelection.selectTask(taskId);
  }

  async selectNext(): Promise<void> {
    // 使用TaskNavigation的过滤逻辑进行导航
    await this.taskNavigation.selectNext();
  }

  async selectPrevious(): Promise<void> {
    // 使用TaskNavigation的过滤逻辑进行导航
    await this.taskNavigation.selectPrevious();
  }

  /**
   * 重写状态转换方法，确保同时更新任务状态
   */
  transition(
    trigger: string,
    context?: any
  ): {
    success: boolean;
    newState?: ApplicationState;
    error?: string;
  } {
    // 先调用父类的状态转换
    const result = super.transition(trigger, context);

    if (!result.success) {
      return result;
    }

    // 根据新的编辑器模式更新选中任务的状态
    const newEditorMode = result.newState?.editorMode;
    if (newEditorMode !== undefined) {
      this.updateSelectedTaskStatus(newEditorMode, trigger);
    }

    return result;
  }

  /**
   * 根据编辑器模式更新选中任务的状态
   */
  private updateSelectedTaskStatus(
    editorMode: EditorMode,
    trigger: string
  ): void {
    this.taskEditing.updateSelectedTaskStatus(editorMode, trigger);
  }

  /**
   * 任务状态操作
   */
  startContentNavigation(): void {
    this.taskEditing.startContentNavigation();
  }

  startEditingAtCursor(): void {
    this.taskEditing.startEditingAtCursor();
  }

  stopEditing(): void {
    this.taskEditing.stopEditing();
  }

  /**
   * 退出内容导航模式，切换到 normal（命令）模式时，选中任务 status 设为 SELECTED
   */
  exitContentNavigation(): void {
    const state = this.getTaskDataState();
    const selectedTask = state.tasks.find((task) => task.selected);
    if (!selectedTask) return;
    const newTasks = state.tasks.map((task) =>
      task.id === selectedTask.id
        ? { ...task, status: TaskState.SELECTED }
        : task
    );
    this.updateState(
      { tasks: newTasks } as Partial<TaskDataState>,
      'exit-content-navigation'
    );
  }

  /**
   * 光标移动操作
   */
  moveCursorUp(): void {
    this.cursorManager.moveCursorUp();
  }

  moveCursorDown(): void {
    this.cursorManager.moveCursorDown();
  }

  moveCursorLeft(): void {
    this.cursorManager.moveCursorLeft();
  }

  moveCursorRight(): void {
    this.cursorManager.moveCursorRight();
  }

  moveCursorToLineStart(): void {
    this.cursorManager.moveCursorToLineStart();
  }

  moveCursorToLineEnd(): void {
    this.cursorManager.moveCursorToLineEnd();
  }

  moveCursorToFirstLine(): void {
    this.cursorManager.moveCursorToFirstLine();
  }

  moveCursorToLastLine(): void {
    this.cursorManager.moveCursorToLastLine();
  }

  /**
   * 在当前光标位置下方插入新行 - 委托给TaskCrudManager
   */
  insertNewLineBelow(): void {
    this.taskCrud.insertNewLineBelow();
  }

  private updateTaskCursor(taskId: number, line: number, column: number): void {
    this.cursorManager.updateCursorPosition(taskId, line, column);
  }

  /**
   * 更新任务光标位置 - 公共方法
   */
  updateTaskCursorPosition(taskId: number, line: number, column: number): void {
    this.updateTaskCursor(taskId, line, column);
  }

  /**
   * 保存任务 - 委托给DataPersistence
   */
  async saveTasks(): Promise<void> {
    await this.dataPersistence.saveTasks();
  }

  /**
   * 加载任务 - 委托给DataPersistence
   */
  async loadTasks(): Promise<void> {
    await this.dataPersistence.loadTasks();
  }

  /**
   * 获取计算属性（兼容Pinia getters）
   */
  get selectedTask(): Task | null {
    return this.taskSelection.selectedTask;
  }

  get selectedTaskIndex(): number {
    return this.taskSelection.selectedTaskIndex;
  }

  get filteredTasks(): Task[] {
    return this.taskQuery.filteredTasks;
  }

  get isSearching(): boolean {
    return this.taskQuery.isSearching;
  }

  /**
   * 任务操作方法
   */
  toggleTaskCompletion(): void {
    this.taskCrud.toggleTaskCompletion();
  }

  startTitleEditing(): void {
    this.taskEditing.startTitleEditing();
  }

  /**
   * 更新任务属性 - 委托给TaskCrudManager
   */
  updateTaskProperty(taskId: number, property: string, value: any): void {
    this.taskCrud.updateTaskProperty(taskId, property, value);
  }

  createNewTask(title: string = '', insertAfter: boolean = true): Task {
    return this.taskCrud.createNewTask(title, insertAfter);
  }

  deleteSelectedTask(): void {
    this.taskCrud.deleteSelectedTask();
  }

  copySelectedTask(): void {
    this.taskCrud.copySelectedTask();
  }

  pasteTask(): void {
    this.taskCrud.pasteTask();
  }

  goToFirst(): void {
    // 使用TaskNavigation的过滤逻辑进行导航
    this.taskNavigation.goToFirst();
  }

  goToLast(): void {
    // 使用TaskNavigation的过滤逻辑进行导航
    this.taskNavigation.goToLast();
  }

  /**
   * 排序任务 - 委托给TaskCrudManager
   */
  sortTasks(sortType: string): void {
    this.taskCrud.sortTasks(sortType);
  }

  toggleHelp(): void {
    const state = this.getTaskDataState();
    this.updateState(
      {
        isHelpVisible: !state.isHelpVisible,
      } as Partial<TaskDataState>,
      'toggle-help'
    );
  }

  /**
   * 显示任务配置页面
   */
  showTaskConfig(): void {
    // 检查是否有选中的任务
    const currentState = this.getState() as TaskDataState;
    const selectedTaskId = currentState.selectedTaskId;
    if (!selectedTaskId || selectedTaskId === -1) {
      logger.debug(
        'TaskDataManager',
        'Cannot show task config: no task selected'
      );
      return;
    }

    // 验证任务是否存在
    const taskExists = currentState.tasks.some(
      (task) => task.id === selectedTaskId
    );
    if (!taskExists) {
      logger.debug(
        'TaskDataManager',
        'Cannot show task config: selected task does not exist'
      );
      return;
    }

    this.updateState(
      {
        isTaskConfigVisible: true,
        editorMode: EditorMode.TASK_CONFIG,
      } as Partial<TaskDataState>,
      'show-task-config'
    );
  }

  /**
   * 退出任务配置页面
   */
  exitTaskConfig(): void {
    this.updateState(
      {
        isTaskConfigVisible: false,
        editorMode: EditorMode.COMMAND,
      } as Partial<TaskDataState>,
      'exit-task-config'
    );
  }
}
