/**
 * 基础模式处理器接口和通用类型
 */

import { TaskDataManager } from '../core/task-data-manager';

export interface ModeHandler {
  handleKey(
    event: KeyboardEvent,
    key: string,
    taskDataManager: TaskDataManager,
    isInInputField: boolean
  ): boolean;
}
