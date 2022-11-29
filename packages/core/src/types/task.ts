import type {Logger} from 'pino';
import type {
  Model,
  Attributes,
  ModelAttributes,
  ModelOptions,
  ModelStatic,
  Sequelize,
} from 'sequelize';
import type {ConfimAction, PluginContextStore} from './index.js';
import type {Page} from 'puppeteer-core';

export interface Task {
  run(): Promise<void>;
  destroy(): Promise<void>;
}

export interface TaskContext<T> {
  name: string;
  log: Logger;
  settings: T;
  getMainModel<M extends Model, TAttributes = Attributes<M>>(
    attributes: ModelAttributes<M, TAttributes>,
    options?: ModelOptions<M>
  ): ModelStatic<M>;
  getSequelize(): Sequelize;
  exit: () => void;
  requestPage(): Page;
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
    progress(): void;
  };
  store: PluginContextStore;
  ioQueue: (interval?: number) => <T>(job: () => Promise<T>) => Promise<T>;
}

export interface TaskConstructorOptions {
  /**
   * markdown support
   */
  description?: string;
  link?: string;
}

export type TaskConstructor<T> = (context: TaskContext<T>) => Task;

export interface TaskTableDefinition {
  id: number;
  version: string;
  plugin: string;
  task: string;
  name?: string;
  settings: unknown;
}
