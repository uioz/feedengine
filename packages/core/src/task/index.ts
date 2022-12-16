/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type {
  Closeable,
  TaskConstructor,
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
import {PluginWrap} from '../plugins/index.js';
import {NotificationType} from '../message/index.js';

interface TaskMeta {
  plugin: PluginWrap;
  taskName: string;
  taskConstructor: TaskConstructor;
  tasksInRunning: Array<TaskWrap>;
}

interface NonStdTaskMeta {
  plugin: PluginWrap;
  taskName: string;
  taskConstructor: unknown;
}

export interface TaskRef {
  _successCb?: (taskId: number) => void;
  _destroyCb?: () => void;
  taskId: number;
  state: TaskState;
  onSuccess(cb: (taskId: number) => void): TaskRef;
  destroy(): void;
}

export enum TaskState {
  pending,
  running,
  finished,
  error,
}

class ExitError extends Error {}

function isStandardTask(task: any): task is TaskConstructor {
  if (typeof task.setup === 'function') {
    return true;
  }

  return false;
}

export class TaskWrap {
  #state = TaskState.pending;
  throttleQueue: Array<fastq.queueAsPromised> = [];
  task!: Task;
  log!: TopDeps['log'];
  pageRef: Page | null = null;
  progress!: ProgressHandler<TaskProgress>;

  constructor(
    private deps: TopDeps,
    private taskRef: TaskRef,
    public taskId: number,
    public scheduleId: number,
    private taskMeta: TaskMeta,
    private settings: unknown
  ) {
    this.progress = this.deps.messageManager.progress('TaskProgress', taskId);
    this.progress.send({
      scheduleId,
      state: 'pending',
    });
    taskMeta.tasksInRunning.push(this);

    this.log = this.deps.log.child({
      source: `${taskMeta.plugin.name}@${taskMeta.taskName}@${taskId}`,
    });

    taskMeta.plugin.taskConcurrencyQueue
      .push(() => {
        if (this.state === TaskState.pending) {
          this.state = TaskState.running;
        }
        return this.run();
      })
      .catch(this.errorHandler);

    this.taskRef._destroyCb = () => this.destroy();
  }

  public get state() {
    return this.#state;
  }

  public set state(v: TaskState) {
    this.#state = v;
    this.taskRef.state = v;
    this.progress.send({
      scheduleId: this.scheduleId,
      state: TaskState[v] as any,
    });
    this.log.info(`state ${TaskState[v]}`);
  }

  async run() {
    const checkIsStillRunning = () => {
      if (this.state !== TaskState.running) {
        throw new Error(`task isn't running`);
      }
    };

    const no = (type: NotificationType) => {
      checkIsStillRunning();
      return this.deps.messageManager.notification(this.scheduleId + '')[type];
    };

    const co = (type: NotificationType) => {
      checkIsStillRunning();
      return this.deps.messageManager.confirm(this.scheduleId + '')[type];
    };

    this.task = this.taskMeta.taskConstructor.setup!({
      taskName: this.taskMeta.taskName,
      pluginName: this.taskMeta.plugin.name,
      taskId: this.taskId,
      scheduleId: this.scheduleId,
      log: this.log,
      settings: this.settings,
      pluginSettings: this.taskMeta.plugin.context.settings,
      sequelize: this.deps.storageManager.sequelize,
      exit: () => {
        throw new ExitError();
      },
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
        progress: (options) => {
          checkIsStillRunning();
          this.progress.send({
            scheduleId: this.scheduleId,
            ...options,
          });
        },
      },
      ioQueue: ((arg: any) => {
        if (typeof arg === 'function') {
          return this.taskMeta.plugin.ioConcurrencyQueue.push(() => {
            checkIsStillRunning();
            return arg();
          });
        }

        if (typeof arg !== 'number') {
          throw new Error('');
        }

        let timestamp = Date.now();

        const queue = fastq.promise(async (job) => {
          const now = Date.now();

          if (now - timestamp < arg) {
            await new Promise((resolve) => setTimeout(resolve, arg - (now - timestamp)));
          }

          try {
            return await this.taskMeta.plugin.ioConcurrencyQueue.push(() => {
              checkIsStillRunning();
              return job();
            });
            // eslint-disable-next-line no-useless-catch
          } catch (error) {
            throw error;
          } finally {
            timestamp = Date.now();
          }
        }, 1);

        this.throttleQueue.push(queue);

        return queue.push;
      }) as any,
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

        return this.taskMeta.plugin.provideStore.get(key);
      },
    });

    try {
      await this.task.run();
      this.taskRef._successCb?.(this.taskId);
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

    if (this.pageRef) {
      this.deps.driverManager.releasePage(this.pageRef);
      this.pageRef = null;
    }

    for (const queue of this.throttleQueue) {
      queue.pause();
      queue.killAndDrain();
    }

    this.throttleQueue = [];

    this.taskRef._destroyCb = this.taskRef._successCb = undefined;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.taskRef = null;

    try {
      this.task.destroy();
    } catch (error) {
      this.log.error(error);
    }
    this.taskMeta.tasksInRunning.splice(
      this.taskMeta.tasksInRunning.findIndex((item) => item === this),
      1
    );
  }
}

export class TaskManager implements Closeable, Initable {
  closed = false;
  log: TopDeps['log'];
  deps: TopDeps;
  messageManager: TopDeps['messageManager'];
  registeredStdTask = new Map<string, TaskMeta>();
  registeredStdNames = new Map<string, Set<string>>();
  nonStdTaskTree = new Map<string, Set<NonStdTaskMeta>>();
  tasksModel: TopDeps['storageManager']['tasksModel'];
  performance!: AppSettings['performance'];
  taskConcurrencyQueue!: queueAsPromised<() => Promise<void>>;
  ioConcurrencyQueue!: queueAsPromised<() => Promise<void>>;

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

  register(plugin: PluginWrap, taskName: string, taskConstructor: unknown) {
    if (isStandardTask(taskConstructor)) {
      this.registeredStdTask.set(`${plugin.name}@${taskName}`, {
        taskConstructor,
        plugin,
        taskName,
        tasksInRunning: [],
      });

      const tasks = this.registeredStdNames.get(plugin.name);

      if (tasks) {
        tasks.add(taskName);
      } else {
        this.registeredStdNames.set(plugin.name, new Set([taskName]));
      }
    } else {
      const nonStdTaskMeta = {
        plugin,
        taskName,
        taskConstructor,
      };

      const result = this.nonStdTaskTree.get(taskName);

      if (result) {
        result.add(nonStdTaskMeta);
      } else {
        this.nonStdTaskTree.set(taskName, new Set([nonStdTaskMeta]));
      }
    }
  }

  unRegisterTaskByPlugin(pluginName: string) {
    for (const [key, value] of this.registeredStdTask.entries()) {
      if (value.plugin.name === pluginName) {
        for (const task of value.tasksInRunning) {
          task.destroy();
        }
        this.registeredStdTask.delete(key);
      }
    }

    this.registeredStdNames.delete(pluginName);

    for (const nonStdSet of this.nonStdTaskTree.values()) {
      for (const nonStdTask of nonStdSet) {
        if (nonStdTask.plugin.name === pluginName) {
          nonStdSet.delete(nonStdTask);
        }
      }
    }
  }

  // for GET /living
  async getAllLivingTaskStatusGroupByPlugin() {
    const pluginNames = [];
    const taskNames = [];

    this.registeredStdNames.values;

    for (const [pluginName, taskNameSets] of this.registeredStdNames.entries()) {
      pluginNames.push(pluginName);
      taskNames.push(...taskNameSets);
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

    const temp: Record<
      string,
      Array<{
        task: string;
        taskCount: number;
        running: Array<{state: TaskState; taskId: number; scheduleId: number}>;
      }>
    > = {};

    for (const {plugin, task, taskCount} of data) {
      if (this.registeredStdNames.get(plugin)?.has(task)) {
        const res = {
          task,
          taskCount,
          running:
            this.registeredStdTask
              .get(`${plugin}@${task}`)
              ?.tasksInRunning.map(({state, taskId, scheduleId}) => ({
                state,
                taskId,
                scheduleId,
              })) ?? [],
        };

        if (temp[plugin]) {
          temp[plugin].push(res);
        } else {
          temp[plugin] = [res];
        }
      }
    }

    return temp;
  }

  // for GET /tasks
  async getAllRegisterTaskGroupByPlugin() {
    const data: TasksRes = {};

    for (const {
      plugin,
      taskName,
      taskConstructor: {description, link},
    } of this.registeredStdTask.values()) {
      const temp = {
        taskName,
        description,
        link,
        instances: [],
      };

      if (data[plugin.name]) {
        data[plugin.name].push(temp);
      } else {
        data[plugin.name] = [temp];
      }
    }

    const tasks = await this.tasksModel.findAll({
      where: {
        plugin: [...this.registeredStdNames.keys()],
        task: [...this.registeredStdNames.values()].map((set) => [...set]).flat(),
      },
    });

    for (const {plugin, task, name, id, settings, createdAt} of tasks) {
      if (this.registeredStdNames.get(plugin)?.has(task)) {
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

  execTask(taskId: number, scheduleId: number) {
    if (this.closed) {
      throw new Error('');
    }

    const taskRef: TaskRef = {
      taskId,
      state: TaskState.pending,
      onSuccess(cb: (taskId: number) => void) {
        this._successCb = cb;
        return this;
      },
      destroy() {
        this._destroyCb?.();
      },
    };

    (async () => {
      const data = await this.tasksModel.findOne({
        where: {
          id: taskId,
        },
      });

      const {plugin: pluginName, task: taskName, settings} = data!;

      const taskMeta = this.registeredStdTask.get(`${pluginName}@${taskName}`)!;

      new TaskWrap(this.deps, taskRef, taskId, scheduleId, taskMeta, settings);
    })();

    return taskRef;
  }

  async createTask(
    pluginName: string,
    taskName: string,
    name?: string,
    settings?: unknown
  ): Promise<number> {
    const taskMeta = this.registeredStdTask.get(`${pluginName}@${taskName}`);

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

    const taskQueues = [
      ...[...this.registeredStdTask.values()].map((item) => item.plugin.taskConcurrencyQueue),
      this.taskConcurrencyQueue,
    ];

    for (const taskQueue of taskQueues) {
      taskQueue.pause();
      taskQueue.kill();
    }

    await this.taskConcurrencyQueue.drain();

    this.log.info('close');
  }
}
