import type {Logger} from 'pino';
import type {
  Model,
  Attributes,
  ModelAttributes,
  ModelOptions,
  ModelStatic,
  Sequelize,
} from 'sequelize';
import {ConfimAction} from './index.js';

export interface Task {
  run(): Promise<void>;
  immediate?(): Promise<void>;
  destroy?(): Promise<void>;
}

export interface TaskContext<T> {
  name: string;
  log: Logger;
  getSettings(): T;
  setSettings(): T;
  getMainModel<M extends Model, TAttributes = Attributes<M>>(
    attributes: ModelAttributes<M, TAttributes>,
    options?: ModelOptions<M>
  ): ModelStatic<M>;
  getSequelize(): Sequelize;
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
