import type {Debugger} from 'debug';

export interface PluginContext {
  debug: Debugger;
}

export interface PluginApp {
  settingUrl?: string;
  dir: string;
}

export interface PluginOptions {
  app?: PluginApp;
  onCreate?: () => void;
  onActive?: () => void;
  onDispose?: () => void;
}

export type PluginOptionsConstructor = (context: PluginContext) => PluginOptions;
