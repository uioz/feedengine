import {PluginState as PS} from './plugin.js';

export interface PluginStateApi {
  name: string;
  version: string;
  state: PS;
  task: Array<{
    task: string;
    taskCount: number;
    working: number;
  }>;
  app?: {
    url: string;
    settings?: string | true;
  };
}