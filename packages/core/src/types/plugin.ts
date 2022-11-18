import type {Debugger} from 'debug';
import {NotificationAction} from '../types/index.js';
import {Emitter} from 'mitt';
import {PluginSpaceEvent} from './event.js';
import type {FastifyPluginCallback} from 'fastify';
import type {TopDeps} from '../index.js';

export interface PluginContext {
  debug: Debugger;
  notification: {
    warn(message: string): void;
    error(message: string): void;
    info(message: string): void;
  };
  confirm: {
    warn(message: string, actions: Array<NotificationAction>): void;
    error(message: string, actions: Array<NotificationAction>): void;
    info(message: string, actions: Array<NotificationAction>): void;
  };
  exit(): void;
  register(callback: FastifyPluginCallback<Record<string, never>>): void;
}

export interface PluginApp {
  baseUrl?: string;
  settingUrl?: string;
  dir: string;
}

export interface PluginOptions {
  app?: PluginApp;
  // TODO: settings , waitPlugin() -> read prop from context
  // TOOD: 插件的状态变化发送对应的消息
  onCreate?: () => Promise<void>;
  onActive?: () => void;
  onDispose?: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSpaceContext {}

export type PluginOptionsConstructor = (
  context: PluginContext & PluginSpaceContext & Emitter<PluginSpaceEvent>,
  internal?: TopDeps
) => PluginOptions;
