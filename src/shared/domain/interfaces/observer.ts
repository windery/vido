/**
 * 观察者模式接口定义
 * 用于实现Domain层和UI层的解耦通信
 */

export interface Observer<T = any> {
  update(data: T): void;
}

export interface Observable<T = any> {
  subscribe(observer: Observer<T>): void;
  unsubscribe(observer: Observer<T>): void;
  notify(data: T): void;
}

/**
 * 状态变化事件接口
 */
export interface StateChangeEvent {
  type: 'state-transition';
  from: {
    editorMode: number;
  };
  to: {
    editorMode: number;
  };
  trigger: string;
  timestamp: number;
}

/**
 * 应用状态接口
 */
export interface ApplicationState {
  editorMode: number;
  taskState: number;
  selectedTaskId?: number;
  cursorPosition?: {
    line: number;
    column: number;
  };
  isHelpVisible: boolean;
  lastlineContent: string;
  lastlineVisible: boolean;
}
