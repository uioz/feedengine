import type {
  Closeable,
  TaskConstructor,
  PluginPerformanceSettings,
  AppSettings,
  TaskConstructorOptions,
  Initable,
} from '../types/index.js';
import type {TopDeps} from '../index.js';
import {Sequelize} from 'sequelize';
import * as fastq from 'fastq';
import type {queueAsPromised} from 'fastq';

interface TaskMeta {
  pluginName: string;
  taskName: string;
  pluginPerformanceSettings: PluginPerformanceSettings;
  options?: TaskConstructorOptions;
  task: TaskConstructor<unknown>;
  tasksInRunning: Array<Task>;
}

enum TaskState {
  pending,
  running,
  finished,
  error,
}

export class Task {
  state = TaskState.pending;
  taskMeta!: TaskMeta;
  settings: unknown;
  ioQueue!: queueAsPromised<() => Promise<void>>;

  constructor(private deps: TopDeps) {}

  init(
    taskMeta: TaskMeta,
    settings: unknown,
    ioQueue: queueAsPromised<() => Promise<void>>,
    taskQueue: queueAsPromised<() => Promise<void>>
  ) {
    this.taskMeta = taskMeta;
    this.settings = settings;
    this.ioQueue = ioQueue;

    taskMeta.tasksInRunning.push(this);

    taskQueue
      .push(async () => {
        if (this.state === TaskState.error || this.state === TaskState.finished) {
          return;
        }
        this.state = TaskState.running;

        await this.run();
      })
      .then(() => {
        this.state = TaskState.finished;
      })
      .catch(() => {
        this.state = TaskState.error;
      })
      .finally(() => {
        taskMeta.tasksInRunning.splice(
          taskMeta.tasksInRunning.findIndex((item) => item === this),
          1
        );
      });
  }

  async run() {
    //
  }

  destroy() {
    //
  }
}

export class TaskManager implements Closeable, Initable {
  log: TopDeps['log'];
  deps: TopDeps;
  messageManager: TopDeps['messageManager'];
  allregisteredTask = new Map<string, TaskMeta>();
  tasksModel: TopDeps['storageManager']['tasksModel'];
  buffer: Array<[string, string, TaskConstructor<unknown>, TaskConstructorOptions | undefined]> =
    [];
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

    this.isReady = true;

    if (this.buffer.length) {
      this.buffer.forEach((args) => this.register(...args));

      this.buffer = [];
    }
  }

  register(
    pluginName: string,
    taskName: string,
    task: TaskConstructor<any>,
    options?: TaskConstructorOptions
  ) {
    if (this.isReady) {
      this.allregisteredTask.set(`${pluginName}@${taskName}`, {
        task,
        pluginName,
        taskName,
        options,
        pluginPerformanceSettings: this.performance.plugins.find(
          (item) => item.name === pluginName
        )!,
        tasksInRunning: [],
      });
    } else {
      this.buffer.push([pluginName, taskName, task, options]);
    }
  }

  unRegisterTaskByPlugin(pluginName: string) {
    if (this.buffer.length) {
      this.buffer = this.buffer.filter((item) => item[0] !== pluginName);
    }

    for (const [key, value] of this.allregisteredTask.entries()) {
      if (value.pluginName === pluginName) {
        this.allregisteredTask.delete(key);
      }
    }
  }

  async getAllTaskStateGroupByPlugin() {
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

    return temp;
  }

  execTask(taskId: number) {
    const task = new Task(this.deps);

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

        task.init(taskMeta, settings, ioQueueForPlugin, taskQueueForPlugin);
      });

    return task;
  }

  destroyTask(task: Task) {
    task.destroy();
  }

  async close() {
    this.log.info('close');
  }
}
