import {readdir, readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Initable, Closeable, NotificationType} from '../types/index.js';
import {TopDeps} from '../index.js';
import {
  PluginOptionsConstructor,
  PluginContext,
  PluginOptions,
  PluginSpaceEvent,
  PluginSpaceContext,
} from '../types/index.js';
import mitt, {Emitter} from 'mitt';

const pluginPattern = /feedengine-.+-plugin$/;

enum PluginState {
  noReady,
  onCreate,
  onActive,
  onDispose,
  error,
}

export class Plugin implements PluginOptions, Initable {
  version!: string;
  dir?: string;
  settingUrl?: string;
  plugin!: PluginOptions;
  state: PluginState = PluginState.noReady;
  context!: PluginContext & PluginSpaceContext & Emitter<PluginSpaceEvent>;

  constructor(
    private options: PluginOptionsConstructor,
    private pluginManager: PluginManager,
    private eventBus: Emitter<PluginSpaceEvent>,
    public name: string,
    private nodeModulesDir: string
  ) {}

  async init() {
    const no = (type: NotificationType) =>
      this.pluginManager.messageManager.notification(this.name)[type];

    const co = (type: NotificationType) =>
      this.pluginManager.messageManager.confirm(this.name)[type];

    // TODO: 提供更加具体的错误

    const context = {
      debug: this.pluginManager.debug,
      confirm: {
        warn: co(NotificationType.warn),
        error: co(NotificationType.error),
        info: co(NotificationType.info),
      },
      notification: {
        warn: no(NotificationType.warn),
        error: no(NotificationType.error),
        info: no(NotificationType.info),
      },
    };

    const eventBus = this.eventBus;

    this.context = new Proxy<PluginContext & PluginSpaceContext & Emitter<PluginSpaceEvent>>(
      context as any,
      {
        get(obj, prop) {
          return prop in obj ? (obj as any)[prop] : (eventBus as any)[prop];
        },
        set(obj, prop, value) {
          if (prop in obj) {
            (obj as any)[prop] = value;
          } else {
            (eventBus as any)[prop] = value;
          }
          return true;
        },
        has(obj, prop) {
          return prop in obj ? true : prop in eventBus;
        },
      }
    );

    try {
      const plugin = this.options(this.context);

      if (plugin.app?.dir) {
        this.dir = resolve(this.nodeModulesDir, this.name, plugin.app.dir);
      }

      this.version = JSON.parse(
        await readFile(resolve(this.nodeModulesDir, this.name, 'package.json'), {
          encoding: 'utf-8',
        })
      ).version;

      this.plugin = plugin;
    } catch (error) {
      this.errorHandler(error);
    }
  }

  async onCreate() {
    this.state = PluginState.onCreate;

    try {
      await this.plugin.onCreate?.();
    } catch (error) {
      this.errorHandler(error);
    }
  }

  onActive() {
    this.state = PluginState.onActive;

    try {
      this.plugin.onActive?.();
    } catch (error) {
      this.errorHandler(error);
    }
  }

  async onDispose() {
    this.state = PluginState.onDispose;

    try {
      await this.plugin.onDispose?.();
    } catch (error) {
      this.errorHandler(error, false);
    }
  }

  private errorHandler(error: unknown, destory = true) {
    this.state = PluginState.error;
    this.context.confirm.error(error + '', [
      {
        label: 'restart',
        type: 'api',
        payload: '/api/restart',
      },
    ]);
    this.context.debug(error);
    if (destory) {
      this.onDispose();
    }
  }
}

export class PluginManager implements Initable, Closeable {
  plugins: Array<Plugin> = [];
  debug: TopDeps['debug'];
  appManager: TopDeps['appManager'];
  messageManager: TopDeps['messageManager'];

  constructor({debug, appManager, messageManager}: TopDeps) {
    this.debug = debug;
    this.appManager = appManager;
    this.messageManager = messageManager;
  }

  private async loadPlugins() {
    const context = mitt<PluginSpaceEvent>();

    const nodeModulesDir = resolve(this.appManager.rootDir, 'node_modules');

    const pluginNames = (await readdir(nodeModulesDir)).filter((name) => pluginPattern.test(name));

    const plugins = await Promise.allSettled(
      pluginNames.map(async (pluginName) => {
        try {
          const {plugin} = (await import(pluginName)) as {plugin: PluginOptionsConstructor};

          if (plugin) {
            this.debug(`load plugin ${pluginName}`);

            const p = new Plugin(plugin, this, context, pluginName, nodeModulesDir);

            await p.init();

            return p;
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
    await this.loadPlugins();

    this.debug(`${PluginManager.name} init`);
  }

  create() {
    for (const plugin of this.plugins) {
      if (plugin.state !== PluginState.error) {
        plugin.onCreate();
        // TODO: 全部插件 create 执行完成后执行插件的 active, 在 create 中挂载 server, 不在此处 await 让 server 快速启动
        // TODO: 加载静态资源, feedengine-app-plugin 作为例外可以使用任意挂载点
      }
    }
  }

  async close() {
    await Promise.all(
      this.plugins
        .filter((item) => item.state !== PluginState.onDispose)
        .map((plugin) => () => plugin.onDispose())
    );

    this.debug(`${PluginManager.name} close`);
  }
}
