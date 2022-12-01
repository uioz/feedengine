import {PluginState as PS} from './plugin.js';

export interface LivingApi {
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

export type TasksApi = Array<{
  pluginName: string;
  tasks: Array<{
    taskName: string;
    setup: boolean;
    description?: string;
    link?: string;
  }>;
}>;
