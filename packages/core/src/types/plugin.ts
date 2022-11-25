import type {Logger} from 'pino';
import {ConfimAction, PluginSettings, TaskConstructor, TaskConstructorOptions} from './index.js';
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
import {PluginState as PS} from '../plugins/index.js';

export interface PluginApp {
  baseUrl?: string; // 默认 /<pluginName>
  settingUrl?: string | true; // 提供 true 则表示整个应用都是用于设置的, 不提供仅有 dir(包括 baseurl) 则表示仅提供应用, 提供则相对于 /<pluginName>/<settingUrl>
  type: 'spa' | 'static';
  dir: string;
}

export interface OnCreateContext {
  waitPlugins(pluginNames: Array<string>): Promise<void>;
}

export interface PluginOptions {
  app?: PluginApp;
  onCreate?: (context: OnCreateContext) => Promise<void>;
  onActive?: () => void;
  onDispose?: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginContextStore {}

export interface PluginContext extends Emitter<PluginSpaceEvent> {
  feedengineVersion: string;
  currentPluginVerison: string;
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
  getSettings<T>(): Promise<PluginSettings<T> | null>;
  setSettings(setting: unknown): Promise<void>;
  getMainModel<M extends Model, TAttributes = Attributes<M>>(
    attributes: ModelAttributes<M, TAttributes>,
    options?: ModelOptions<M>
  ): ModelStatic<M>;
  getSequelize(): Sequelize;
  registerTask<T>(
    taskName: string,
    task: TaskConstructor<T>,
    options?: TaskConstructorOptions
  ): void;
  store: PluginContextStore;
}

export type PluginOptionsConstructor<CorePlugin = boolean> = (
  context: PluginContext,
  internal: CorePlugin extends true ? TopDeps : undefined
) => PluginOptions;

export type PluginState = keyof typeof PS;
