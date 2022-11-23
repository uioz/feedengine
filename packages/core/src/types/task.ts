import type {Emitter} from 'mitt';
import type {PluginSpaceEvent} from './event.js';
import type {PluginContextAPI, PluginSpaceContext} from './plugin.js';

interface Task {
  run(): Promise<void>;
}

export interface TaskConstructor {
  new (options: Emitter<PluginSpaceEvent> & PluginContextAPI & PluginSpaceContext): Task;
}

export interface TaskRegisterOptions {
  immediate?: boolean;
}

export interface TaskTableDefinition {
  id: number;
  version: string;
  plugin: string;
  task: string;
  name?: string;
  settings: unknown;
}
