import type {Logger} from 'pino';
import {ConfimAction, PluginSettings, TaskConstructor, PluginProgress} from './index.js';
import {Emitter} from 'mitt';
import {PluginSpaceEvent} from './event.js';
import type {FastifyPluginCallback} from 'fastify';
import type {TopDeps} from '../index.js';
import type {Sequelize} from 'sequelize';
import {PluginState as PS} from '../plugins/index.js';
import type {Page} from 'puppeteer-core';

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
  rootDir: string;
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
      warn(message: string, actions?: Array<ConfimAction>): void;
      error(message: string, actions?: Array<ConfimAction>): void;
      info(message: string, actions?: Array<ConfimAction>): void;
    };
    progress(options: Pick<PluginProgress, 'message' | 'progress'>): void;
  };
  exit(): void;
  registerFastifyPlugin(callback: FastifyPluginCallback<any>): void;
  getSettings<T>(): Promise<PluginSettings<T> | null>;
  setSettings(setting: unknown): Promise<void>;
  getSequelize(): Sequelize;
  registerTask(taskName: string, task: TaskConstructor): void;
  requestPage(): Page;
  store: PluginContextStore;
}

export type PluginOptionsConstructor<CorePlugin = boolean> = (
  context: PluginContext,
  internal: CorePlugin extends true ? TopDeps : undefined
) => PluginOptions;

export type PluginState = keyof typeof PS;
