import type {Logger} from 'pino';
import {ConfimAction, PluginSetting} from '../types/index.js';
import {Emitter} from 'mitt';
import {PluginSpaceEvent} from './event.js';
import type {FastifyPluginCallback} from 'fastify';
import type {TopDeps} from '../index.js';
import type {
  Model,
  Attributes,
  ModelAttributes,
  ModelOptions,
  ModelStatic,
  Sequelize,
} from 'sequelize';

export interface PluginContext {
  name: string;
  log: Logger;
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
  };
  exit(): void;
  registerFastifyPlugin(callback: FastifyPluginCallback<any>): void;
  getSettings<T>(): Promise<PluginSetting<T> | null>;
  setSettings(setting: unknown): Promise<void>;
  getMainTable<M extends Model, TAttributes = Attributes<M>>(
    attributes: ModelAttributes<M, TAttributes>,
    options?: ModelOptions<M>
  ): ModelStatic<M>;
  getSequelize(): Sequelize;
}

export interface PluginApp {
  baseUrl?: string;
  settingUrl?: string;
  type: 'spa' | 'static';
  dir: string;
}

export interface OnCreateContext {
  feedengineVersion: string;
  currentPluginVerison: string;
  waitPlugins(pluginNames: Array<string>): Promise<void>;
}

export interface PluginOptions {
  app?: PluginApp;
  // TOOD: 插件的状态变化发送对应的消息
  onCreate?: (context: OnCreateContext) => Promise<void>;
  onActive?: () => void;
  onDispose?: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSpaceContext {}

export type PluginOptionsConstructor = (
  context: PluginContext & PluginSpaceContext & Emitter<PluginSpaceEvent>,
  internal?: TopDeps
) => PluginOptions;
