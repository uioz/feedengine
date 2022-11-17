import type {Debugger} from 'debug';
import {NotificationAction} from '../types/index.js';
import {Emitter} from 'mitt';
import {PluginSpaceEvent} from './event.js';

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
}

export interface PluginApp {
  settingUrl?: string;
  dir: string;
}

export interface PluginOptions {
  app?: PluginApp;
  onCreate?: () => Promise<void>;
  onActive?: () => void;
  onDispose?: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSpaceContext {}

export type PluginOptionsConstructor = (
  context: PluginContext & PluginSpaceContext & Emitter<PluginSpaceEvent>
) => PluginOptions;
