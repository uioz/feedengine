export * from './types/index.js';
import type {Plugin, App, OptionsConstructor} from './types/index.js';

export function definePlugin(app: App): Plugin;
export function definePlugin(options: OptionsConstructor): Plugin;
export function definePlugin(app: App, options: OptionsConstructor): Plugin;
export function definePlugin(args1: App | OptionsConstructor, args2?: OptionsConstructor): Plugin {
  const plugin: Plugin = {};

  if (typeof args1 === 'object') {
    plugin.app = args1;

    if (args2) {
      plugin.options = args2;
    }
  } else {
    plugin.options = args1;
  }

  return plugin;
}
