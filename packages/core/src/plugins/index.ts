import {readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {Plugin as PluginI, App, OptionsConstructor} from 'feedengine-plugin';
import {Initable} from '../types/index.js';
import {TopDeps} from '../index.js';

const pluginPattern = /feedengine-.+-plugin$/;

class Plugin implements PluginI {
  name = '';
  app?: App;
  options?: OptionsConstructor;

  constructor(plugin: PluginI) {
    Object.assign(this, plugin);
  }

  setName(name: string) {
    this.name = name;
    return this;
  }
}

export class PluginManager implements Initable {
  plugins: Array<Plugin> = [];
  debug: TopDeps['debug'];
  appManager: TopDeps['appManager'];

  constructor({debug, appManager}: TopDeps) {
    this.debug = debug;
    this.appManager = appManager;
  }

  private async loadPlugins() {
    const nodeModulesDir = resolve(this.appManager.rootDir, './node_modules');

    const pluginNames = (await readdir(nodeModulesDir)).filter((name) => pluginPattern.test(name));

    const plugins = await Promise.allSettled(
      pluginNames.map(async (pluginName) => {
        try {
          const {plugin} = (await import(pluginName)) as {plugin: PluginI};

          if (plugin) {
            this.debug(`load plugin ${pluginName}`);

            if (plugin.app?.dir) {
              plugin.app.dir = resolve(nodeModulesDir, pluginName, plugin.app.dir);
            }

            return new Plugin(plugin).setName(pluginName);
          }

          throw new Error(`the ${pluginName} doesn't have named export of plugin`);
        } catch (error) {
          this.debug(`load plugin ${pluginName} failed reason: ${error}`);
          throw error;
        }
      })
    );

    this.plugins = plugins
      .filter((item) => item.status === 'fulfilled')
      .map((item) => (item as PromiseFulfilledResult<Plugin>).value);
  }

  async init() {
    this.debug(`${PluginManager.name} init`);
    await this.loadPlugins();
  }
}
