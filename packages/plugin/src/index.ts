export * from './types/index.js';
import type {PluginOptionsConstructor} from './types/index.js';

export function definePlugin(options: PluginOptionsConstructor): PluginOptionsConstructor {
  return options;
}
