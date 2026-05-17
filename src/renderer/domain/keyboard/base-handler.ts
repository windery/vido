/**
 * 基础模式处理器接口
 */

import { TaskDataManager } from '../core/task-data-manager';

export interface ModeHandler {
  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: TaskDataManager,
    isInInputField: boolean
  ): boolean;

  /** 清理资源（超时、序列状态等） */
  dispose(): void;
}
