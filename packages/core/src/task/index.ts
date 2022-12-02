import type {
  Closeable,
  TaskConstructor,
  PluginPerformanceSettings,
  AppSettings,
  Initable,
  Task,
  TasksRes,
} from '../types/index.js';
import type {TopDeps} from '../index.js';
import {Sequelize} from 'sequelize';
import * as fastq from 'fastq';
import type {queueAsPromised} from 'fastq';
import type {Model, Attributes, ModelAttributes, ModelOptions} from 'sequelize';
import {Page} from 'puppeteer-core';
import {PluginState} from '../plugins/index.js';

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
  successCallback: ((taskId: number) => void) | null = null;
  pageRef: Page | null = null;

  constructor(private deps: TopDeps) {}

  public get state() {
    return this.#state;
  }

  public set state(v: TaskState) {
    this.#state = v;
    // TODO: send the task's state to client
    this.log.info(`state ${TaskState[v]}`);
  }

  init(
    taskId: number,
    taskMeta: TaskMeta,
    settings: unknown,
    ioQueue: queueAsPromised<() => Promise<any>>,
    taskQueue: queueAsPromised<() => Promise<void>>,
    successCallback: (taskId: number) => void
  ) {
    this.taskId = taskId;
    this.taskMeta = taskMeta;
    this.settings = settings;
    this.ioQueue = ioQueue;
    this.successCallback = successCallback;

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

    this.task = this.taskMeta.taskConstructor.setup!({
      taskName: this.taskMeta.taskName,
      pluginName: this.taskMeta.pluginName,
      id: this.taskId,
      log: this.log,
      settings: this.settings,
      getMainModel: <M extends Model, TAttributes = Attributes<M>>(
        attributes: ModelAttributes<M, TAttributes>,
        options?: ModelOptions<M>
      ) => {
        return this.deps.storageManager.sequelize.define(
          this.taskMeta.pluginName,
          attributes,
          options
        );
      },
      getSequelize: () => this.deps.storageManager.sequelize,
      exit: () => {
        throw new ExitError();
      },
      ioQueue: (timeout?: number) => (job) => {
        checkIsStillRunning();

        return this.ioQueue.push(async () => {
          checkIsStillRunning();
          if (timeout) {
            await new Promise((resolve) => setTimeout(resolve, timeout));

            checkIsStillRunning();

            return await job();
          } else {
            return await job();
          }
        });
      },
      requestPage: async () => {
        checkIsStillRunning();

        if (this.pageRef) {
          throw new Error('');
        }

        this.pageRef = await this.deps.driverManager.requestPage();

        checkIsStillRunning();

        return this.pageRef;
      },
      store: this.deps.pluginManager.store,
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

    if (this.pageRef) {
      this.deps.driverManager.releasePage(this.pageRef, true);
      this.pageRef = null;
    }

    this.state = TaskState.error;

    // TODO: confirm

    this.log.error(error);

    this.destroy();
  }

  destroy() {
    if (this.state !== TaskState.error) {
      this.state = TaskState.finished;
    }

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
      .then((data) => {
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
