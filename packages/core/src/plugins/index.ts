import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {TopDeps} from '../index.js';
import {
  PluginOptionsConstructor,
  PluginContext,
  PluginOptions,
  PluginSpaceEvent,
  PluginProgress,
  ProgressHandler,
  TaskConstructor,
  Initable,
  Closeable,
  PluginContextStore,
  ProgressMessage,
  InjectionKey,
  PluginPerformanceSettings,
} from '../types/index.js';
import mitt, {Emitter} from 'mitt';
import fastifyStatic from '@fastify/static';
import type {FastifyPluginCallback} from 'fastify';
import {EventEmitter} from 'node:events';
import {NotificationType} from '../message/index.js';
import type {Page} from 'puppeteer-core';
import fastq, {type queueAsPromised} from 'fastq';

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
  progress: ProgressHandler<PluginProgress>;
  pageRef: Page | null = null;
  log: TopDeps['log'];
  provideStore = new Map<InjectionKey<any>, any>();
  performanceSettings!: PluginPerformanceSettings;
  taskConcurrencyQueue!: queueAsPromised<() => Promise<void>>;
  ioConcurrencyQueue!: queueAsPromised<() => Promise<void>>;

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

    this.log = this.deps.log.child({source: this.name});

    this.progress = this.deps.messageManager.progress<PluginProgress>('PluginProgress', name);
  }

  public get state(): PluginState {
    return this.#state;
  }

  public set state(v: PluginState) {
    this.pluginStates.get(this.#state)?.delete(this.name);

    this.pluginStates.get(v)?.add(this.name);

    this.#state = v;

    this.progress.send({
      state: PluginState[v] as any,
    });

    this.log.info(`state ${PluginState[v]}`);

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
    const {plugins} = await this.deps.appManager.getPerformance();

    for (const plugin of plugins) {
      if (plugin.name === this.name) {
        this.performanceSettings = plugin;
      }
    }

    const no = (type: NotificationType) => this.deps.messageManager.notification(this.name)[type];

    const co = (type: NotificationType) => this.deps.messageManager.confirm(this.name)[type];

    this.context = {
      rootDir: this.deps.feedengine.rootDir,
      verison: this.version,
      feedengineVersion: this.deps.feedengine.version,
      name: this.name,
      log: this.log,
      window: {
        confirm: {
          warn: co(NotificationType.warning),
          error: co(NotificationType.error),
          info: co(NotificationType.info),
        },
        notification: {
          warn: no(NotificationType.warning),
          error: no(NotificationType.error),
          info: no(NotificationType.info),
        },
        progress: <T extends ProgressMessage>(options: Partial<Omit<T, 'channel' | 'source'>>) =>
          this.progress.send(options),
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
      emit: this.eventBus.emit,
      register: {
        fastifyPlugin: (callback: FastifyPluginCallback<any>) => {
          if (this.state !== PluginState.ready) {
            throw new Error('the register only works before any hooks execution');
          }

          this.fastifyPluginRegister = callback;
        },
        task: (taskName: string, taskConstructor: TaskConstructor) => {
          if (this.state !== PluginState.ready) {
            throw new Error('the register only works before any hooks execution');
          }

          this.deps.taskManager.register(this, taskName, taskConstructor);
        },
      },
      settings: {
        get: <T>() => this.deps.settingManager.getPluginSettings<T>(this.name),
        set: (settings: unknown) => this.deps.settingManager.setPluginSettings(this.name, settings),
      },
      sequelize: this.deps.storageManager.sequelize,
      page: {
        request: async () => {
          if (
            this.state !== PluginState.init &&
            this.state !== PluginState.created &&
            this.state !== PluginState.actived
          ) {
            throw new Error('');
          }

          if (this.pageRef) {
            return this.pageRef;
          }

          this.pageRef = await this.deps.driverManager.requestPage(true);

          return this.pageRef;
        },
        release: async () => {
          if (this.pageRef) {
            await this.deps.driverManager.releasePage(this.pageRef, true);
          }
          this.pageRef = null;
        },
      },
      store: this.store,
      tool: {
        gotScraping: await this.deps.gotScraping,
        toughCookie: this.deps.toughCookie,
        serializeForTough: this.deps.serializeForTough,
      },
      provide: (key: symbol, value: unknown) => {
        if (this.state === PluginState.error || this.state === PluginState.disposed) {
          throw new Error('');
        }
        this.provideStore.set(key, value);
      },
    };

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

      this.registerFastifyPlugin();

      const ioConcurrencyQueue = this.deps.taskManager.ioConcurrencyQueue;

      this.ioConcurrencyQueue = fastq.promise(
        (job) => ioConcurrencyQueue.push(job),
        this.performanceSettings.maxIo
      );

      const taskConcurrencyQueue = this.deps.taskManager.taskConcurrencyQueue;

      this.taskConcurrencyQueue = fastq.promise(
        (job) => taskConcurrencyQueue.push(job),
        this.performanceSettings.maxTask
      );

      this.plugin = plugin;

      this.state = PluginState.init;
    } catch (error) {
      this.errorHandler(error);
    }
  }

  async onCreate() {
    if (this.plugin.onCreate === undefined) {
      this.state = PluginState.created;
      return;
    }

    try {
      const hook = this.hook;

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

      this.context.page.release();
    } catch (error) {
      this.errorHandler(error);
    }
  }

  onActive() {
    try {
      this.plugin.onActive?.();
      this.state = PluginState.actived;
    } catch (error) {
      this.errorHandler(error);
    }
  }

  async onDispose() {
    if (this.state !== PluginState.error && this.state !== PluginState.disposed) {
      this.state = PluginState.disposed;
    }

    this.progress.end();

    try {
      // TODO: 清空 store 上挂载的资源
      for (const [key, sets] of this.eventListener.entries()) {
        for (const handler of sets) {
          this.eventBus.off(key, handler);
        }
        this.eventListener.delete(key);
      }

      this.deps.taskManager.unRegisterTaskByPlugin(this.name);

      this.context.page.release();

      this.provideStore.clear();

      await this.plugin.onDispose?.();
    } catch (error) {
      this.errorHandler(error, false);
    }
  }

  private errorHandler(error: unknown, destory = true) {
    if (error instanceof ExitError) {
      return this.onDispose();
    }

    if (this.state !== PluginState.disposed) {
      this.state = PluginState.error;
    }

    this.context.log.error(error);

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

    const createdHandler = () => {
      const amnoutOfNormallyPlugin = getAmnoutOfNormallyPlugin();

      if (this.pluginStates.get(PluginState.created)!.size === amnoutOfNormallyPlugin) {
        this.emit(`all-${PluginState[PluginState.created]}`);
      }
    };

    this.on(PluginState[PluginState.created], createdHandler);

    const activeHandler = () => {
      const amnoutOfNormallyPlugin = getAmnoutOfNormallyPlugin();

      if (this.pluginStates.get(PluginState.actived)!.size === amnoutOfNormallyPlugin) {
        this.emit(`all-${PluginState[PluginState.actived]}`);
        this.removeAllListeners();
      }
    };

    this.on(PluginState[PluginState.actived], activeHandler);

    this.on(PluginState[PluginState.error], () => {
      createdHandler();
      activeHandler();
    });
  }
}

export class PluginManager implements Initable, Closeable {
  loadedPlugins: Array<PluginWrap> = [];
  log: TopDeps['log'];
  appManager: TopDeps['appManager'];
  store: PluginContextStore = {};
  pluginStates = new Map<PluginState, Set<string>>([
    [PluginState.init, new Set()],
    [PluginState.created, new Set()],
    [PluginState.actived, new Set()],
    [PluginState.disposed, new Set()],
    [PluginState.error, new Set()],
  ]);
  hook!: Hook;

  constructor(private deps: TopDeps) {
    this.log = deps.log.child({source: PluginManager.name});
    this.appManager = deps.appManager;
  }

  async loadPlugins() {
    const context = mitt<PluginSpaceEvent>();

    const nodeModulesDir = resolve(this.deps.feedengine.rootDir, 'node_modules');

    const dependencies: Record<string, string> = JSON.parse(
      await readFile(resolve(this.deps.feedengine.rootDir, 'package.json'), {
        encoding: 'utf-8',
      })
    ).dependencies;

    const pluginsInDeps = Object.keys(dependencies).filter((name) => pluginPattern.test(name));

    const loadedPluginNamesSet: Set<string> = new Set();

    this.hook = new Hook(loadedPluginNamesSet, this.pluginStates);

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
                this.hook,
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
  }

  async init() {
    await Promise.all(
      this.loadedPlugins
        .filter(({name}) => !builtinPlugins.has(name))
        .map((plugin) => plugin.init())
    );

    await Promise.all(
      this.loadedPlugins.filter(({name}) => builtinPlugins.has(name)).map((plugin) => plugin.init())
    );

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
