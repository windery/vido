/**
 * 状态管理器基类
 * 实现观察者模式，提供状态变化通知机制
 */

import {
  Observable,
  Observer,
  StateChangeEvent,
  ApplicationState,
} from '../interfaces/observer';
import { logger } from '../../utils/logger';

export abstract class StateManager implements Observable<StateChangeEvent> {
  private observers: Observer<StateChangeEvent>[] = [];
  protected currentState: ApplicationState;

  constructor(initialState: ApplicationState) {
    this.currentState = { ...initialState };
  }

  /**
   * 订阅状态变化
   */
  subscribe(observer: Observer<StateChangeEvent>): void {
    this.observers.push(observer);
  }

  /**
   * 取消订阅
   */
  unsubscribe(observer: Observer<StateChangeEvent>): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * 通知所有观察者
   */
  notify(event: StateChangeEvent): void {
    this.observers.forEach((observer) => {
      try {
        observer.update(event);
      } catch (error) {
        logger.error('StateManager', 'Observer update failed', { error });
      }
    });
  }

  /**
   * 获取当前状态（只读）
   */
  getState(): Readonly<ApplicationState> {
    return Object.freeze({ ...this.currentState });
  }

  /**
   * 抽象方法：执行状态转换
   */
  abstract transition(
    trigger: string,
    context?: any
  ): {
    success: boolean;
    newState?: ApplicationState;
    error?: string;
  };

  /**
   * 受保护的状态更新方法
   */
  protected updateState(
    newState: Partial<ApplicationState>,
    trigger: string
  ): void {
    const previousState = { ...this.currentState };
    this.currentState = { ...this.currentState, ...newState };

    // 通知状态变化
    this.notify({
      type: 'state-transition',
      from: {
        editorMode: previousState.editorMode,
      },
      to: {
        editorMode: this.currentState.editorMode,
      },
      trigger,
      timestamp: Date.now(),
    });
  }

  /**
   * 验证状态转换是否有效
   */
  protected abstract validateTransition(
    from: ApplicationState,
    to: Partial<ApplicationState>,
    trigger: string
  ): boolean;
}
