import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {TopDeps} from '../index.js';
import {
  PluginOptionsConstructor,
  PluginContext,
  PluginOptions,
  PluginSpaceEvent,
  PluginLifeCycleProgress,
  ProgressHandler,
  TaskConstructor,
  Initable,
  Closeable,
  PluginContextStore,
  TaskConstructorOptions,
} from '../types/index.js';
import mitt, {Emitter} from 'mitt';
import fastifyStatic from '@fastify/static';
import type {FastifyPluginCallback} from 'fastify';
import {EventEmitter} from 'node:events';
import type {Model, Attributes, ModelAttributes, ModelOptions} from 'sequelize';
import {NotificationType} from '../message/index.js';
import type {Page} from 'puppeteer-core';

export enum PluginState {
  ready,
  init,
  created,
  actived,
  disposed,
  error,
}

const builtinPlugins = new Set(['feedengine-app-plugin', 'feedengine-atom-plugin']);

const pluginPattern = /feedengine-.+-plugin$/;

class ExitError extends Error {}

export class PluginWrap implements PluginOptions, Initable {
  version!: string;
  dir?: string;
  settingUrl?: string | true;
  baseUrl: string;
  plugin!: PluginOptions;
  #state = PluginState.ready;
  context!: PluginContext;
  eventListener = new Map<any, Set<any>>();
  fastifyPluginRegister?: FastifyPluginCallback<any>;
  lifecycleProgress: ProgressHandler<PluginLifeCycleProgress>;
  pageRef?: Page;

  constructor(
    private options: PluginOptionsConstructor,
    private eventBus: Emitter<PluginSpaceEvent>,
    public name: string,
    private nodeModulesDir: string,
    private deps: TopDeps,
    private hook: Hook,
    public store: PluginContextStore,
    private pluginStates: Map<PluginState, Set<string>>
  ) {
    if (builtinPlugins.has(name)) {
      this.baseUrl = '/';
    } else {
      this.baseUrl = `/${name}/`;
    }

    hook.once(`all-${PluginState[PluginState.created]}`, () => {
      if (this.state === PluginState.created) {
        this.onActive();
      }
    });

    this.lifecycleProgress = this.deps.messageManager.progress(name);
  }

  public get state(): PluginState {
    return this.#state;
  }

  public set state(v: PluginState) {
    this.pluginStates.get(this.#state)?.delete(this.name);

    this.pluginStates.get(v)?.add(this.name);

    this.#state = v;

    this.hook.emit(PluginState[v], this.name);
  }

  private registerFastifyPlugin() {
    if (this.dir) {
      this.deps.serverManager.server.register(fastifyStatic, {
        root: this.dir,
        wildcard: false,
        prefix: this.baseUrl,
        allowedPath: () => this.state === PluginState.actived,
      });
    }

    if (this.fastifyPluginRegister) {
      this.deps.serverManager.server.register((fastify, opts, done) => {
        fastify.addHook('onRequest', (req, res, done) => {
          if (this.state === PluginState.actived) {
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

    this.context = {
      rootDir: this.deps.feedengine.rootDir,
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
      exit: () => {
        throw new ExitError();
      },
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
        if (this.state !== PluginState.ready) {
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
      registerTask: <T>(
        taskName: string,
        task: TaskConstructor<T>,
        options?: TaskConstructorOptions
      ) => {
        if (this.state !== PluginState.ready) {
          throw new Error('the register only works before any hooks execution');
        }

        this.deps.taskManager.register(this.name, taskName, task, options);
      },
      requestPage: async () => {
        if (this.state !== PluginState.init) {
          throw new Error('');
        }

        if (this.pageRef) {
          throw new Error('');
        }

        this.pageRef = await this.deps.driverManager.requestPage();

        return this.pageRef;
      },
      store: this.store,
    } as any;

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

      this.state = PluginState.init;
    } catch (error) {
      this.errorHandler(error);
    }

    this.context.log.info('init');
  }

  async onCreate() {
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
              if (!hook.loadedPluginsNames.has(targetName)) {
                return reject(new Error(`There's no plugin called ${targetName}`));
              }
              if (hook.pluginStates.get(PluginState.error)!.has(targetName)) {
                return reject(new Error(`loading plugin ${targetName} was failed`));
              }
              if (!hook.pluginStates.get(PluginState.created)!.has(targetName)) {
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
                  hook.removeListener(PluginState[PluginState.created], createdHandler);
                }
              }
            };

            hook.on(PluginState[PluginState.created], createdHandler);

            const errorHandler = (name: string) => {
              if (namesThatNeedToWatch.has(name)) {
                reject(new Error(`loading plugin ${name} was failed`));
                hook.removeListener(PluginState[PluginState.error], errorHandler);
              }
            };

            hook.on(PluginState[PluginState.error], errorHandler);
          }),
      });

      this.state = PluginState.created;

      if (this.pageRef) {
        this.deps.driverManager.releasePage(this.pageRef);
      }
    } catch (error) {
      this.errorHandler(error);
    }

    this.context.log.info('onCreate');
  }

  onActive() {
    this.lifecycleProgress.send({
      state: 'active',
    });

    try {
      this.plugin.onActive?.();
      this.state = PluginState.actived;
    } catch (error) {
      this.errorHandler(error);
    }

    this.context.log.info('onActive');
  }

  async onDispose() {
    if (this.state !== PluginState.error && this.state !== PluginState.disposed) {
      this.state = PluginState.disposed;
    }

    try {
      this.lifecycleProgress
        .send({
          state: 'close',
        })
        .end();

      // TODO: 清空 store 上挂载的资源
      for (const [key, sets] of this.eventListener.entries()) {
        for (const handler of sets) {
          this.eventBus.off(key, handler);
        }
        this.eventListener.delete(key);
      }

      this.deps.taskManager.unRegisterTaskByPlugin(this.name);

      if (this.pageRef) {
        this.deps.driverManager.releasePage(this.pageRef, this.state === PluginState.error);
      }

      await this.plugin.onDispose?.();
    } catch (error) {
      this.errorHandler(error, false);
    }

    this.context.log.info('onDispose');
  }

  private errorHandler(error: unknown, destory = true) {
    if (error instanceof ExitError) {
      return this.onDispose();
    }

    this.context.log.error(error);

    this.state = PluginState.error;

    this.lifecycleProgress
      .send({
        state: 'error',
      })
      .end();

    this.context.window.confirm.error(error + '', [
      {
        label: 'restart',
        type: 'api',
        payload: '/api/restart',
      },
    ]);

    if (destory) {
      this.onDispose();
    }
  }
}

class Hook extends EventEmitter {
  constructor(
    public loadedPluginsNames: Set<string>,
    public pluginStates: Map<PluginState, Set<string>>
  ) {
    super();

    const getAmnoutOfNormallyPlugin = () =>
      this.loadedPluginsNames.size -
      (this.pluginStates.get(PluginState.error)!.size +
        this.pluginStates.get(PluginState.disposed)!.size);

    this.on(PluginState[PluginState.created], () => {
      const amnoutOfNormallyPlugin = getAmnoutOfNormallyPlugin();

      if (this.pluginStates.get(PluginState.created)!.size === amnoutOfNormallyPlugin) {
        setImmediate(() => this.emit(`all-${PluginState[PluginState.created]}`));
      }
    });

    this.on(PluginState[PluginState.actived], () => {
      const amnoutOfNormallyPlugin = getAmnoutOfNormallyPlugin();

      if (this.pluginStates.get(PluginState.actived)!.size === amnoutOfNormallyPlugin) {
        setImmediate(() => {
          this.emit(`all-${PluginState[PluginState.actived]}`);
          this.removeAllListeners();
        });
      }
    });
  }
}

export class PluginManager implements Initable, Closeable {
  loadedPlugins: Array<PluginWrap> = [];
  log: TopDeps['log'];
  appManager: TopDeps['appManager'];
  postInit: Array<() => void> = [];
  store: PluginContextStore = {};
  pluginStates = new Map<PluginState, Set<string>>([
    [PluginState.init, new Set()],
    [PluginState.created, new Set()],
    [PluginState.actived, new Set()],
    [PluginState.disposed, new Set()],
    [PluginState.error, new Set()],
  ]);

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

    const pluginsInDeps = Object.keys(dependencies).filter((name) => pluginPattern.test(name));

    const loadedPluginNamesSet: Set<string> = new Set();

    const hook = new Hook(loadedPluginNamesSet, this.pluginStates);

    hook.once(`all-${PluginState[PluginState.actived]}`, () => this.deps.scheduleManager.active());

    this.loadedPlugins = (
      await Promise.all(
        pluginsInDeps.map(async (pluginName) => {
          try {
            const {plugin} = (await import(pluginName)) as {plugin: PluginOptionsConstructor};

            if (plugin) {
              this.log.info(`load plugin ${pluginName}`);

              const p = new PluginWrap(
                plugin,
                context,
                pluginName,
                nodeModulesDir,
                this.deps,
                hook,
                this.store,
                this.pluginStates
              );

              return p;
            }

            throw new Error(`the ${pluginName} doesn't have named export of plugin`);
          } catch (error) {
            this.log.warn(`load plugin ${pluginName} failed reason: ${error}`);
          }
        })
      )
    ).filter((item) => item !== undefined) as Array<PluginWrap>;

    this.loadedPlugins.forEach(({name}) => loadedPluginNamesSet.add(name));

    await Promise.all(this.loadedPlugins.map((plugin) => plugin.init()));
  }

  async init() {
    await this.loadPlugins();

    this.postInit.forEach((post) => post());

    this.postInit = [];

    this.log.info(`init`);
  }

  create() {
    for (const plugin of this.loadedPlugins) {
      if (plugin.state === PluginState.init) {
        plugin.onCreate();
      }
    }
  }

  async close() {
    await Promise.all(
      this.loadedPlugins
        .filter((item) => item.state === PluginState.actived)
        .map((plugin) => () => plugin.onDispose())
    );

    this.log.info(`close`);
  }
}
