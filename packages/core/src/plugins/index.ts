import {readdir, readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Initable, Closeable} from '../types/index.js';
import {TopDeps} from '../index.js';
import {PluginOptionsConstructor, PluginContext, PluginOptions} from '../types/index.js';

const pluginPattern = /feedengine-.+-plugin$/;

export class Plugin implements PluginOptions {
  name!: string;
  version!: string;
  dir?: string;
  settingUrl?: string;
  options!: PluginOptions;

  constructor(
    options: {
      name: string;
      version: string;
      dir?: string;
      settingUrl?: string;
      options: PluginOptions;
    },
    public context: PluginContext
  ) {
    Object.assign(this, options);
  }
  onCreate() {
    return this.options.onCreate?.();
  }

  onActive() {
    return this.options.onActive?.();
  }

  onDispose() {
    return this.options.onDispose?.();
  }
}

export class PluginManager implements Initable, Closeable {
  plugins: Array<Plugin> = [];
  debug: TopDeps['debug'];
  appManager: TopDeps['appManager'];

  constructor({debug, appManager}: TopDeps) {
    this.debug = debug;
    this.appManager = appManager;
  }

  private async loadPlugins() {
    const nodeModulesDir = resolve(this.appManager.rootDir, 'node_modules');

    const pluginNames = (await readdir(nodeModulesDir)).filter((name) => pluginPattern.test(name));

    const plugins = await Promise.allSettled(
      pluginNames.map(async (pluginName) => {
        try {
          const {plugin} = (await import(pluginName)) as {plugin: PluginOptionsConstructor};

          if (plugin) {
            this.debug(`load plugin ${pluginName}`);

            const context: PluginContext = {debug: this.debug};

            const options = plugin(context);

            if (options.app?.dir) {
              options.app.dir = resolve(nodeModulesDir, pluginName, options.app.dir);
            }

            const version = JSON.parse(
              await readFile(resolve(nodeModulesDir, pluginName, 'package.json'), {
                encoding: 'utf-8',
              })
            ).version;

            return new Plugin(
              {
                name: pluginName,
                version,
                dir: options.app?.dir,
                settingUrl: options.app?.settingUrl,
                options: options,
              },
              context
            );
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
    if (this.appManager.firstBooting) {
      return;
    }

    await this.loadPlugins();

    this.debug(`${PluginManager.name} init`);
  }

  async close() {
    if (!this.appManager.firstBooting) {
      // TODO: close
    }

    this.debug(`${PluginManager.name} close`);
  }
}
