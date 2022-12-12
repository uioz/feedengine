import type {Logger} from 'pino';
import type {Sequelize} from 'sequelize';
import type {PluginContextStore, ConfimAction, TaskProgress, InjectionKey} from './index.js';
import type {Page} from 'puppeteer-core';
import {TaskState as TS} from '../task/index.js';

export type TaskState = keyof typeof TS;

export interface Task {
  run(): Promise<void>;
  destroy(): void;
}

export interface TaskContext<T> {
  pluginName: string;
  taskName: string;
  taskId: number;
  scheduleId: number;
  log: Logger;
  settings: T;
  sequelize: Sequelize;
  exit: () => void;
  page: {
    request(): Promise<Page>;
    release(): Promise<void>;
  };
  window: {
    notification: {
      warn(message: string): void;
      error(message: string): void;
      info(message: string): void;
    };
    confirm: {
      warn(message: string, actions: Array<ConfimAction>): void;
      error(message: string, actions: Array<ConfimAction>): void;
      info(message: string, actions: Array<ConfimAction>): void;
    };
    progress(options: Pick<TaskProgress, 'message' | 'progress'>): void;
  };
  store: PluginContextStore;
  ioQueue<T>(
    job: T
  ): T extends () => Promise<unknown>
    ? ReturnType<T>
    : T extends number
    ? <K>(job: () => Promise<K>) => Promise<K>
    : never;
  inject<T>(key: InjectionKey<T>): T;
}

export interface TaskConstructor {
  /**
   * markdown support
   */
  description?: string;
  link?: string;
  setup?(context: TaskContext<any>): Task;
}

export interface TaskTableDefinition {
  id: number;
  version: string;
  plugin: string;
  task: string;
  name?: string;
  settings: unknown;
}
