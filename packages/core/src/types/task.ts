import type {Emitter} from 'mitt';
import type {PluginSpaceEvent} from './event.js';
import type {PluginContext, PluginSpaceContext} from './plugin.js';

interface Task {
  run(): Promise<void>;
}

export interface TaskConstructor {
  new (options: Emitter<PluginSpaceEvent> & PluginContext & PluginSpaceContext): Task;
}

export interface TaskRegisterOptions {
  fastMode?: boolean;
}

export interface TaskTableDefinition {
  id: number;
  version: string;
  plugin: string;
  task: string;
  name: string;
  settings: unknown;
}
