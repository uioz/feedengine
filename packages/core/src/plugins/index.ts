import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Initable, Closeable} from '../types/index.js';
import {TopDeps} from '../index.js';
import {
  PluginOptionsConstructor,
  PluginContext,
  PluginOptions,
  PluginSpaceEvent,
  PluginLifeCycleProgress,
  ProgressHandler,
  TaskConstructor,
} from '../types/index.js';
import mitt, {Emitter} from 'mitt';
import fastifyStatic from '@fastify/static';
import type {FastifyPluginCallback} from 'fastify';
import {EventEmitter} from 'node:events';
import type {Model, Attributes, ModelAttributes, ModelOptions} from 'sequelize';
import {NotificationType} from '../message/index.js';

export enum PluginState {
  notReady = 'notReady',
  onCreate = 'onCreate',
  onActive = 'onActive',
  onDispose = 'onDispose',
  error = 'error',
}

const builtinPlugins = new Set(['feedengine-app-plugin', 'feedengine-atom-plugin']);

const pluginPattern = /feedengine-.+-plugin$/;

export class Plugin implements PluginOptions, Initable {
  version!: string;
  dir?: string;
  settingUrl?: string | true;
  baseUrl: string;
  plugin!: PluginOptions;
  state: keyof typeof PluginState = PluginState.notReady;
  context!: PluginContext;
  eventListener = new Map<any, Set<any>>();
  fastifyPluginRegister?: FastifyPluginCallback<any>;
  lifecycleProgress: ProgressHandler<PluginLifeCycleProgress>;

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
    } else {
      this.baseUrl = `/${name}/`;
    }

    hook.once('allSettled', () => this.onActive());

    this.lifecycleProgress = this.deps.messageManager.progress(name);
  }

  private registerFastifyPlugin() {
    if (this.dir) {
      this.deps.serverManager.server.register(fastifyStatic, {
        root: this.dir,
        wildcard: false,
        prefix: this.baseUrl,
        allowedPath: () => this.state === PluginState.onActive,
      });
    }

    if (this.fastifyPluginRegister) {
      this.deps.serverManager.server.register((fastify, opts, done) => {
        fastify.addHook('onRequest', (req, res, done) => {
          if (this.state === PluginState.onActive) {
            done();
          } else {
            res.code(500).send();
          }
        });

        if (this.fastifyPluginRegister) {
          fastify.register(this.fastifyPluginRegister, {
            prefix: `/api${this.baseUrl}`,
          });
        }
        done();
      });
    }
  }

  async init() {
    this.lifecycleProgress.send({
      state: 'init',
    });

    const no = (type: NotificationType) => this.deps.messageManager.notification(this.name)[type];

    const co = (type: NotificationType) => this.deps.messageManager.confirm(this.name)[type];

    const context = {
      currentPluginVerison: this.version,
      feedengineVersion: this.deps.feedengine.version,
      name: this.name,
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
      registerFastifyPlugin: (callback: FastifyPluginCallback<any>) => {
        if (this.state !== PluginState.notReady) {
          throw new Error('the register only works before any hooks execution');
        }

        this.fastifyPluginRegister = callback;
      },
      getSettings: () => this.deps.settingManager.getPluginSettings(this.name),
      setSettings: (settings: unknown) =>
        this.deps.settingManager.setPluginSettings({
          name: this.name,
          version: this.version,
          settings,
        }),
      getMainModel: <M extends Model, TAttributes = Attributes<M>>(
        attributes: ModelAttributes<M, TAttributes>,
        options?: ModelOptions<M>
      ) => {
        return this.deps.storageManager.sequelize.define(this.name, attributes, options);
      },
      getSequelize: () => this.deps.storageManager.sequelize,
      registerTask: <T>(taskName: string, task: TaskConstructor<T>) => {
        if (this.state !== PluginState.notReady) {
          throw new Error('the register only works before any hooks execution');
        }

        this.deps.taskManager.register(this.name, taskName, task);
      },
    };

    const eventBus = this.eventBus;

    this.context = new Proxy<PluginContext>(context as any, {
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
    });

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

        if (typeof settingUrl === 'string') {
          this.settingUrl = this.baseUrl + settingUrl;
        } else {
          this.settingUrl = settingUrl;
        }
      }

      // feedengine-app-plugin 默认使用 / 作为 baseUrl
      // 如果先于其他插件注册到 fastify 会覆盖其他插件的路由
      // 因为 feedengine-app-plugin 会拦截一切非文件的请求响应 index.html
      if (this.name === 'feedengine-app-plugin') {
        this.deps.pluginManager.postInit.push(() => this.registerFastifyPlugin());
      }

      this.plugin = plugin;
    } catch (error) {
      this.hook.emit('error', this.name);
      this.errorHandler(error);
    }

    this.context.log.info('init');
  }

  async onCreate() {
    this.state = PluginState.onCreate;

    this.lifecycleProgress.send({
      state: 'create',
    });

    const hook = this.hook;

    try {
      await this.plugin.onCreate?.({
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

    this.context.log.info('onCreate');
  }

  onActive() {
    this.state = PluginState.onActive;

    this.lifecycleProgress.send({
      state: 'active',
    });

    try {
      this.plugin.onActive?.();
    } catch (error) {
      this.errorHandler(error);
    }

    this.lifecycleProgress.end();
    this.context.log.info('onActive');
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

    this.context.log.info('onDispose');
  }

  private errorHandler(error: unknown, destory = true) {
    this.state = PluginState.error;

    this.lifecycleProgress
      .send({
        state: 'error',
      })
      .end();

    this.deps.pluginManager.successPlugins.delete(this.name);

    this.deps.pluginManager.faliedPlugins.add(this.name);

    this.deps.taskManager.unRegisterTaskByPlugin(this.name);

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
        setImmediate(() => {
          this.emit('allSettled');
          this.removeAllListeners();
        });
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
  successPlugins = new Set<string>();
  faliedPlugins = new Set<string>();
  log: TopDeps['log'];
  appManager: TopDeps['appManager'];
  postInit: Array<() => void> = [];

  constructor(private deps: TopDeps) {
    this.log = deps.log.child({source: PluginManager.name});
    this.appManager = deps.appManager;
  }

  private async loadPlugins() {
    const context = mitt<PluginSpaceEvent>();

    const nodeModulesDir = resolve(this.deps.feedengine.rootDir, 'node_modules');

    const dependencies: Record<string, string> = JSON.parse(
      await readFile(resolve(this.deps.feedengine.rootDir, 'package.json'), {
        encoding: 'utf-8',
      })
    ).dependencies;

    const pluginNames = Object.keys(dependencies).filter((name) => pluginPattern.test(name));

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

          (error as any).pluginName = pluginName;

          throw error;
        }
      })
    );

    for (const plugin of plugins) {
      if (plugin.status === 'fulfilled') {
        this.plugins.push(plugin.value);
        this.successPlugins.add(plugin.value.name);
      } else {
        this.faliedPlugins.add(plugin.reason.pluginName);
      }
    }
  }

  async init() {
    await this.loadPlugins();

    this.postInit.forEach((post) => post());

    this.postInit = [];

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
