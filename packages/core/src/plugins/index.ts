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
import {EventEmitter} from 'node:events';

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
    private deps: TopDeps,
    private hook: Hook
  ) {
    if (builtinPlugins.has(name)) {
      this.baseUrl = '/';
      this.settingUrl = '';
    } else {
      this.baseUrl = `/plugin/${name}/`;
      this.settingUrl = '';
    }

    hook.once('allSettled', () => this.onActive());
  }

  private registerFastifyPlugin() {
    if (this.dir || this.fastifyPluginRegister) {
      this.deps.serverManager.server.register(
        (fastify, opts, done) => {
          fastify.addHook('onRequest', (req, res, done) => {
            if (this.state === PluginState.onActive) {
              done();
            } else {
              res.code(500).send();
            }
          });

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
      log: this.deps.log.child({source: this.name}),
      window: {
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
      registerFastifyPlugin: (callback: FastifyPluginCallback<Record<string, never>>) => {
        if (this.state !== PluginState.noReady) {
          throw new Error('the register only works before any hooks execution');
        }

        this.fastifyPluginRegister = callback;
      },
      getSetting: () => this.deps.settingManager.getPluginSetting(this.name),
      setSetting: (settings: unknown) =>
        this.deps.settingManager.setPluginSetting({
          name: this.name,
          version: this.version,
          settings,
        }),
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
            // TODO: 可能要记录当前插件向 globalContext 写入的所有属性
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
      this.hook.emit('error', this.name);
      this.errorHandler(error);
    }
  }

  async onCreate() {
    this.state = PluginState.onCreate;

    const hook = this.hook;

    try {
      await this.plugin.onCreate?.({
        currentPluginVerison: this.version,
        feedengineVersion: this.deps.appManager.version,
        waitPlugins: (pluginNames) =>
          new Promise((resolve, reject) => {
            const namesThatNeedToWatch = new Set();

            for (const targetName of pluginNames) {
              if (!hook.pluginNames.has(targetName)) {
                return reject(new Error(`There's no plugin called ${targetName}`));
              }
              if (hook.pluginThatError.has(targetName)) {
                return reject(new Error(`loading plugin ${targetName} was failed`));
              }
              if (!hook.pluginThatCreated.has(targetName)) {
                namesThatNeedToWatch.add(targetName);
              }
            }

            if (namesThatNeedToWatch.size === 0) {
              resolve();
            }

            const createdHandler = (name: string) => {
              if (namesThatNeedToWatch.has(name)) {
                namesThatNeedToWatch.delete(name);
                if (namesThatNeedToWatch.size === 0) {
                  resolve();
                  hook.removeListener('created', createdHandler);
                }
              }
            };

            hook.on('created', createdHandler);

            const errorHandler = (name: string) => {
              if (namesThatNeedToWatch.has(name)) {
                reject(new Error(`loading plugin ${name} was failed`));
                hook.removeListener('error', errorHandler);
              }
            };

            hook.on('error', errorHandler);
          }),
      });
      this.hook.emit('created', this.name);
    } catch (error) {
      this.hook.emit('error', this.name);
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
    this.context.window.confirm.error(error + '', [
      {
        label: 'restart',
        type: 'api',
        payload: '/api/restart',
      },
    ]);
    this.context.log.error(error);
    if (destory) {
      this.onDispose();
    }
  }
}

class Hook extends EventEmitter {
  pluginThatCreated = new Set<string>();
  pluginThatError = new Set<string>();

  constructor(public pluginNames: Set<string>) {
    super();

    const isPluginCreatedStateCompleted = () => {
      if (this.pluginThatCreated.size + this.pluginThatError.size === this.pluginNames.size) {
        this.emit('allSettled');
        setImmediate(() => this.removeAllListeners());
      }
    };

    this.on('error', (name) => {
      this.pluginThatError.add(name);
      isPluginCreatedStateCompleted();
    });

    this.on('created', (name) => {
      this.pluginThatCreated.add(name);
      isPluginCreatedStateCompleted();
    });
  }
}

export class PluginManager implements Initable, Closeable {
  plugins: Array<Plugin> = [];
  log: TopDeps['log'];
  appManager: TopDeps['appManager'];

  constructor(private deps: TopDeps) {
    this.log = deps.log.child({source: PluginManager.name});
    this.appManager = deps.appManager;
  }

  private async loadPlugins() {
    const context = mitt<PluginSpaceEvent>();

    const nodeModulesDir = resolve(this.appManager.rootDir, 'node_modules');

    const pluginNames = (await readdir(nodeModulesDir)).filter((name) => pluginPattern.test(name));

    const hook = new Hook(new Set(pluginNames));

    const plugins = await Promise.allSettled(
      pluginNames.map(async (pluginName) => {
        try {
          const {plugin} = (await import(pluginName)) as {plugin: PluginOptionsConstructor};

          if (plugin) {
            this.log.info(`load plugin ${pluginName}`);

            const p = new Plugin(plugin, context, pluginName, nodeModulesDir, this.deps, hook);

            await p.init();

            return p;
          }

          throw new Error(`the ${pluginName} doesn't have named export of plugin`);
        } catch (error) {
          this.log.warn(`load plugin ${pluginName} failed reason: ${error}`);
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

    this.log.info(`init`);
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

    this.log.info(`close`);
  }
}
