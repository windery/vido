/**
 * 任务配置模式处理器
 */

import { TaskDataManager } from '../core/task-data-manager';
import { logger } from '../../utils/logger';

export class TaskConfigModeHandler {
  handleKey(event: KeyboardEvent, taskDataManager: TaskDataManager): boolean {
    logger.info('TaskConfigModeHandler', `Handling key: ${event.key}`);

    switch (event.key) {
      case 'Escape':
        // 退出配置模式
        taskDataManager.exitTaskConfig();
        return true;
      default:
        // 其他键由组件处理
        return false;
    }
  }
}
