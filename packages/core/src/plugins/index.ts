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
import fastifyStatic from '@fastify/static';
import type {FastifyPluginCallback} from 'fastify';

const builtinPlugins = new Set(['feedengine-app-plugin']);

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
  settingUrl: string;
  baseUrl: string;
  plugin!: PluginOptions;
  state: PluginState = PluginState.noReady;
  context!: PluginContext & PluginSpaceContext & Emitter<PluginSpaceEvent>;
  eventListener = new Map<any, Set<any>>();
  fastifyPluginRegister?: FastifyPluginCallback<Record<string, never>>;

  constructor(
    private options: PluginOptionsConstructor,
    private eventBus: Emitter<PluginSpaceEvent>,
    public name: string,
    private nodeModulesDir: string,
    private deps: TopDeps
  ) {
    if (builtinPlugins.has(name)) {
      this.baseUrl = '/';
      this.settingUrl = '';
    } else {
      this.baseUrl = `/plugin/${name}/`;
      this.settingUrl = '';
    }
  }

  private registerFastifyPlugin() {
    if (this.dir || this.fastifyPluginRegister) {
      this.deps.serverManager.server.register(
        (fastify, opts, done) => {
          // TODO: 提供 hook 来对静态资源和插件提供的 API 进行阻拦如果插件启动失败
          // fastify.addHook('onRequest')

          if (this.dir) {
            fastify.register(fastifyStatic, {
              root: this.dir,
              wildcard: false,
            });
          }

          if (this.fastifyPluginRegister) {
            this.fastifyPluginRegister(fastify, {}, done);
          } else {
            done();
          }
        },
        {
          prefix: this.baseUrl,
        }
      );
    }
  }

  async init() {
    const no = (type: NotificationType) => this.deps.messageManager.notification(this.name)[type];

    const co = (type: NotificationType) => this.deps.messageManager.confirm(this.name)[type];

    const context = {
      debug: this.deps.debug,
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
      exit: () => this.onDispose(),
      on: (key: any, handler: any) => {
        const listener = this.eventListener.get(key);

        if (listener) {
          listener.add(handler);
        } else {
          this.eventListener.set(key, new Set([listener]));
        }

        this.eventBus.on(key, handler);
      },
      off: (key: any, handler: any) => {
        const listener = this.eventListener.get(key);

        if (listener) {
          listener.delete(handler);
        }

        this.eventBus.off(key, handler);
      },
      register: (callback: FastifyPluginCallback<Record<string, never>>) => {
        if (this.state !== PluginState.noReady) {
          throw new Error('the register only works before any hooks execution');
        }

        this.fastifyPluginRegister = callback;
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
      const plugin = this.options(
        this.context,
        builtinPlugins.has(this.name) ? this.deps : undefined
      );

      this.version = JSON.parse(
        await readFile(resolve(this.nodeModulesDir, this.name, 'package.json'), {
          encoding: 'utf-8',
        })
      ).version;

      if (plugin.app) {
        const {dir, baseUrl, settingUrl} = plugin.app;

        this.dir = resolve(this.nodeModulesDir, this.name, dir);

        if (baseUrl) {
          this.baseUrl += baseUrl;
        }

        if (settingUrl) {
          this.settingUrl = this.baseUrl + settingUrl;
        } else {
          this.settingUrl = this.baseUrl + 'settings';
        }
      }

      this.registerFastifyPlugin();

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
      // TODO: 清空可能挂载的所有资源
      for (const [key, sets] of this.eventListener.entries()) {
        for (const handler of sets) {
          this.eventBus.off(key, handler);
        }
        this.eventListener.delete(key);
      }

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

  constructor(private deps: TopDeps) {
    this.debug = deps.debug;
    this.appManager = deps.appManager;
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

            const p = new Plugin(plugin, context, pluginName, nodeModulesDir, this.deps);

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
      }
    }
  }

  async close() {
    await Promise.all(
      this.plugins
        .filter((item) => item.state === PluginState.onActive)
        .map((plugin) => () => plugin.onDispose())
    );

    this.debug(`${PluginManager.name} close`);
  }
}
