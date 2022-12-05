import type {
  Closeable,
  TaskConstructor,
  PluginPerformanceSettings,
  AppSettings,
  Initable,
  Task,
  TasksRes,
  ProgressHandler,
  TaskProgress,
  InjectionKey,
} from '../types/index.js';
import type {TopDeps} from '../index.js';
import {Sequelize} from 'sequelize';
import * as fastq from 'fastq';
import type {queueAsPromised} from 'fastq';
import {Page} from 'puppeteer-core';
import {PluginState} from '../plugins/index.js';
import {NotificationType} from '../message/index.js';

interface TaskMeta {
  pluginName: string;
  taskName: string;
  pluginPerformanceSettings: PluginPerformanceSettings;
  taskConstructor: TaskConstructor;
  tasksInRunning: Array<TaskWrap>;
}

export enum TaskState {
  pending,
  running,
  finished,
  error,
}

class ExitError extends Error {}

export class TaskWrap {
  #state = TaskState.pending;
  taskMeta!: TaskMeta;
  settings: unknown;
  ioQueue!: queueAsPromised<() => Promise<any>>;
  task!: Task;
  log!: TopDeps['log'];
  taskId!: number;
  pluginId!: number;
  successCallback: ((taskId: number) => void) | null = null;
  pageRef: Page | null = null;
  progress!: ProgressHandler<TaskProgress>;

  constructor(private deps: TopDeps) {}

  public get state() {
    return this.#state;
  }

  public set state(v: TaskState) {
    this.#state = v;
    this.progress.send({
      state: TaskState[v] as any,
    });
    this.log.info(`state ${TaskState[v]}`);
  }

  init(
    pluginId: number,
    taskId: number,
    taskMeta: TaskMeta,
    settings: unknown,
    ioQueue: queueAsPromised<() => Promise<any>>,
    taskQueue: queueAsPromised<() => Promise<void>>,
    successCallback: (taskId: number) => void
  ) {
    this.pluginId = pluginId;
    this.taskId = taskId;
    this.taskMeta = taskMeta;
    this.settings = settings;
    this.ioQueue = ioQueue;
    this.successCallback = successCallback;
    this.progress = this.deps.messageManager.progress('TaskProgress', taskMeta.taskName);

    this.progress.send({
      state: 'pending',
    });

    taskMeta.tasksInRunning.push(this);

    this.log = this.deps.log.child({
      source: `${taskMeta.pluginName}@${taskMeta.taskName}@${taskId}`,
    });

    taskQueue.push(async () => {
      if (this.state === TaskState.pending) {
        this.state = TaskState.running;
        await this.run();
      }
    });
  }

  async run() {
    const checkIsStillRunning = () => {
      if (this.state !== TaskState.running) {
        throw new Error(`task isn't running`);
      }
    };

    const no = (type: NotificationType) => {
      checkIsStillRunning();
      return this.deps.messageManager.notification(
        `${this.taskMeta.pluginName}@${this.taskMeta.taskName}`
      )[type];
    };

    const co = (type: NotificationType) => {
      checkIsStillRunning();
      return this.deps.messageManager.confirm(
        `${this.taskMeta.pluginName}@${this.taskMeta.taskName}`
      )[type];
    };

    this.task = this.taskMeta.taskConstructor.setup!({
      taskName: this.taskMeta.taskName,
      pluginName: this.taskMeta.pluginName,
      taskId: this.taskId,
      pluginId: this.pluginId,
      log: this.log,
      settings: this.settings,
      sequelize: this.deps.storageManager.sequelize,
      exit: () => {
        throw new ExitError();
      },
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
        progress: (options) => {
          checkIsStillRunning();
          this.progress.send(options);
        },
      },
      ioQueue: (timeout?: number) => (job) => {
        checkIsStillRunning();

        if (timeout === undefined) {
          return this.ioQueue.push(async () => {
            checkIsStillRunning();
            const result = await job();
            checkIsStillRunning();
            return result;
          });
        } else {
          let timestamp = Date.now();

          return this.ioQueue.push(async () => {
            checkIsStillRunning();
            const now = Date.now();

            if (now - timestamp < timeout) {
              await new Promise((resolve) => setTimeout(resolve, timeout - (now - timestamp)));
            }
            checkIsStillRunning();

            try {
              const result = await job();
              checkIsStillRunning();
              return result;
              // eslint-disable-next-line no-useless-catch
            } catch (error) {
              throw error;
            } finally {
              timestamp = Date.now();
            }
          });
        }
      },
      page: {
        request: async () => {
          checkIsStillRunning();

          if (this.pageRef) {
            throw new Error('');
          }

          this.pageRef = await this.deps.driverManager.requestPage();

          checkIsStillRunning();

          return this.pageRef;
        },
        release: async () => {
          if (this.pageRef) {
            await this.deps.driverManager.releasePage(this.pageRef);
          }
          this.pageRef = null;
        },
      },
      store: this.deps.pluginManager.store,
      inject: <T>(key: InjectionKey<T>) => {
        checkIsStillRunning();

        return this.deps.pluginManager.loadedPlugins
          .find(({name}) => name === this.taskMeta.pluginName)!
          .provideStore.get(key);
      },
    });

    try {
      await this.task.run();
      this.successCallback?.(this.taskId);
      this.destroy();
    } catch (error) {
      this.errorHandler(error);
    }
  }

  private errorHandler(error: unknown) {
    if (error instanceof ExitError) {
      return this.destroy();
    }

    // TODO: confirm
    this.log.error(error);

    if (this.state !== TaskState.finished) {
      this.state = TaskState.error;
      this.destroy();
    }
  }

  destroy() {
    if (this.state !== TaskState.error) {
      this.state = TaskState.finished;
    }

    this.progress.end();

    try {
      if (this.pageRef) {
        this.deps.driverManager.releasePage(this.pageRef);
        this.pageRef = null;
      }
      this.task.destroy();
      this.successCallback = null;
    } catch (error) {
      this.log.error(error);
    } finally {
      this.taskMeta.tasksInRunning.splice(
        this.taskMeta.tasksInRunning.findIndex((item) => item === this),
        1
      );
    }
  }
}

export class TaskManager implements Closeable, Initable {
  closed = false;
  log: TopDeps['log'];
  deps: TopDeps;
  messageManager: TopDeps['messageManager'];
  allregisteredTask = new Map<string, TaskMeta>();
  registeredTree = new Map<string, Set<string>>();
  tasksModel: TopDeps['storageManager']['tasksModel'];
  buffer: Array<[string, string, TaskConstructor]> = [];
  isReady = false;
  performance!: AppSettings['performance'];

  taskConcurrencyQueue!: queueAsPromised<() => Promise<void>>;
  taskConcurrencyQueueForPlugin = new Map<string, queueAsPromised<() => Promise<void>>>();

  ioConcurrencyQueue!: queueAsPromised<() => Promise<void>>;
  ioConcurrencyQueueForPlugin = new Map<string, queueAsPromised<() => Promise<void>>>();

  constructor(deps: TopDeps) {
    this.deps = deps;
    this.log = deps.log.child({source: TaskManager.name});
    this.messageManager = deps.messageManager;

    this.tasksModel = deps.storageManager.tasksModel;
  }

  async init() {
    this.performance = await this.deps.appManager.getPerformance();

    this.taskConcurrencyQueue = fastq.promise((job) => job(), this.performance.taskConcurrency);

    this.ioConcurrencyQueue = fastq.promise((job) => job(), this.performance.ioConcurrency);

    this.log.info('init');
  }

  async prune() {
    // TODO: 不在移除失效的插件对应的任务, 避免插件卸载用于调试目的的情况下误将之前的配置删除
    // 提供内置任务设计, 修建的操作改为手动执行
    const pluginNamesInDb = (
      await this.tasksModel.findAll({
        attributes: ['plugin'],
      })
    ).map((item) => item.plugin);

    const outdatedPlugins = [];

    for (const pluginNameInDb of pluginNamesInDb) {
      if (
        this.deps.pluginManager.loadedPlugins.findIndex(
          (plugin) => plugin.name === pluginNameInDb
        ) === -1
      ) {
        outdatedPlugins.push(pluginNameInDb);
      }
    }

    if (outdatedPlugins.length) {
      await this.tasksModel.destroy({
        where: {
          plugin: outdatedPlugins,
        },
      });
    }
  }

  active() {
    this.isReady = true;

    if (this.buffer.length) {
      this.buffer.forEach((args) => this.register(...args));

      this.buffer = [];
    }
  }

  register(pluginName: string, taskName: string, taskConstructor: TaskConstructor) {
    if (this.isReady) {
      if (this.deps.pluginManager.pluginStates.get(PluginState.actived)!.has(pluginName)) {
        this.allregisteredTask.set(`${pluginName}@${taskName}`, {
          taskConstructor,
          pluginName,
          taskName,
          pluginPerformanceSettings: this.performance.plugins.find(
            (item) => item.name === pluginName
          )!,
          tasksInRunning: [],
        });

        const tasks = this.registeredTree.get(pluginName);

        if (tasks) {
          tasks.add(taskName);
        } else {
          this.registeredTree.set(pluginName, new Set([taskName]));
        }
      }
    } else {
      this.buffer.push([pluginName, taskName, taskConstructor]);
    }
  }

  unRegisterTaskByPlugin(pluginName: string) {
    if (this.buffer.length) {
      this.buffer = this.buffer.filter((item) => item[0] !== pluginName);
    }

    for (const [key, value] of this.allregisteredTask.entries()) {
      if (value.pluginName === pluginName) {
        for (const task of value.tasksInRunning) {
          task.destroy();
        }
        this.allregisteredTask.delete(key);
      }
    }

    this.registeredTree.delete(pluginName);
  }

  // for GET /living
  async getAllLivingTaskStatusGroupByPlugin() {
    const pluginNames = [];
    const taskNames = [];

    for (const {pluginName, taskName} of this.allregisteredTask.values()) {
      pluginNames.push(pluginName);
      taskNames.push(taskName);
    }

    const data = await this.tasksModel.findAll({
      attributes: {
        include: [[Sequelize.fn('COUNT', Sequelize.col('task')), 'taskCount']],
      },
      where: {
        plugin: pluginNames,
        task: taskNames,
      },
      group: ['plugin', 'task'],
    });

    const temp: Record<string, Array<{task: string; taskCount: number; working: number}>> = {};

    for (const {plugin, task, taskCount} of data) {
      if (this.registeredTree.get(plugin)?.has(task)) {
        if (temp[plugin]) {
          temp[plugin].push({
            task,
            taskCount,
            working: this.allregisteredTask.get(`${plugin}@${task}`)?.tasksInRunning.length ?? 0,
          });
        } else {
          temp[plugin] = [{task, taskCount, working: 0}];
        }
      }
    }

    return temp;
  }

  // for GET /tasks
  async getAllRegisterTaskGroupByPlugin() {
    const data: TasksRes = {};

    for (const {
      pluginName,
      taskName,
      taskConstructor: {setup, description, link},
    } of this.allregisteredTask.values()) {
      const temp = {
        taskName,
        setup: !!setup,
        description,
        link,
        instances: [],
      };

      if (data[pluginName]) {
        data[pluginName].push(temp);
      } else {
        data[pluginName] = [temp];
      }
    }

    const tasks = await this.tasksModel.findAll({
      where: {
        plugin: [...this.registeredTree.keys()],
        task: [...this.registeredTree.values()].map((set) => [...set]).flat(),
      },
    });

    for (const {plugin, task, name, id, settings, createdAt} of tasks) {
      if (this.registeredTree.get(plugin)?.has(task)) {
        data[plugin]!.find(({taskName}) => taskName === task)!.instances.push({
          name,
          id,
          settings,
          createdAt,
        });
      }
    }

    return data;
  }

  execTask(taskId: number, successCallback: (taskId: number) => void) {
    if (this.closed) {
      throw new Error('');
    }

    for (const {tasksInRunning} of this.allregisteredTask.values()) {
      for (const task of tasksInRunning) {
        if (taskId === task.taskId) {
          throw new Error('duplicated task');
        }
      }
    }

    const task = new TaskWrap(this.deps);

    this.tasksModel
      .findOne({
        where: {
          id: taskId,
        },
      })
      .then(async (data) => {
        const {plugin: pluginName, task: taskName, settings} = data!;

        const taskMeta = this.allregisteredTask.get(`${pluginName}@${taskName}`)!;

        let taskQueueForPlugin = this.taskConcurrencyQueueForPlugin.get(pluginName);

        if (taskQueueForPlugin === undefined) {
          taskQueueForPlugin = fastq.promise(
            (job) => this.taskConcurrencyQueue.push(job),
            taskMeta.pluginPerformanceSettings.maxTask
          );

          this.taskConcurrencyQueueForPlugin.set(pluginName, taskQueueForPlugin);
        }

        let ioQueueForPlugin = this.ioConcurrencyQueueForPlugin.get(pluginName);

        if (ioQueueForPlugin === undefined) {
          ioQueueForPlugin = fastq.promise(
            (job) => this.ioConcurrencyQueue.push(job),
            taskMeta.pluginPerformanceSettings.maxIo
          );
        }

        task.init(
          (await this.deps.storageManager.pluginModel.findOne({
            where: {
              name: pluginName,
            },
          }))!.id,
          taskId,
          taskMeta,
          settings,
          ioQueueForPlugin,
          taskQueueForPlugin,
          successCallback
        );
      });

    return task;
  }

  async createTask(
    pluginName: string,
    taskName: string,
    name?: string,
    settings?: unknown
  ): Promise<number> {
    const taskMeta = this.allregisteredTask.get(`${pluginName}@${taskName}`);

    if (taskMeta === undefined) {
      throw new Error('');
    }

    if (taskMeta.taskConstructor.setup) {
      throw new Error('');
    }

    const {id} = await this.tasksModel.create({
      plugin: pluginName,
      task: taskName,
      name,
      settings,
    });

    return id;
  }

  async close() {
    this.closed = true;

    const allQueue = [...this.taskConcurrencyQueueForPlugin.values(), this.taskConcurrencyQueue];

    await Promise.all(
      allQueue.map((queue) => {
        queue.kill();

        return queue.drained();
      })
    );

    this.log.info('close');
  }
}
