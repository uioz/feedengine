import type {
  Closeable,
  TaskConstructor,
  PluginPerformanceSettings,
  AppSettings,
  Initable,
  TaskTableDefinition,
  TaskConstructorOptions,
} from '../types/index.js';
import type {TopDeps} from '../index.js';
import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  ModelStatic,
  Sequelize,
} from 'sequelize';

interface TaskMeta {
  pluginName: string;
  taskName: string;
  pluginPerformanceSettings: PluginPerformanceSettings;
  options?: TaskConstructorOptions;
  task: TaskConstructor<unknown>;
}

interface TaskModel
  extends TaskTableDefinition,
    Model<InferAttributes<TaskModel>, InferCreationAttributes<TaskModel>> {}

const taskTableName = 'task';

export class TaskManager implements Initable, Closeable {
  log: TopDeps['log'];
  messageManager: TopDeps['messageManager'];
  pluginManager: TopDeps['pluginManager'];
  appManager: TopDeps['appManager'];
  feedengineMeta: TopDeps['feedengine'];
  allregisteredTask = new Map<string, TaskMeta>();
  performance!: AppSettings['performance'];
  taskModel: ModelStatic<TaskModel>;
  buffer: Array<[string, string, TaskConstructor<unknown>, TaskConstructorOptions | undefined]> =
    [];
  isReady = false;

  constructor({
    log,
    messageManager,
    pluginManager,
    appManager,
    feedengine,
    storageManager,
  }: TopDeps) {
    this.log = log.child({source: TaskManager.name});
    this.messageManager = messageManager;
    this.pluginManager = pluginManager;
    this.appManager = appManager;
    this.feedengineMeta = feedengine;

    this.taskModel = storageManager.sequelize.define<TaskModel>(taskTableName, {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      version: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      plugin: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      task: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      settings: {
        type: DataTypes.JSON,
      },
    });
  }

  async init() {
    // TODO: 不在移除失效的插件对应的任务, 避免插件卸载用于调试目的的情况下误将之前的配置删除
    // 提供内置任务设计, 修建的操作改为手动执行
    const [performance] = await Promise.all([
      this.appManager.getPerformance(),
      (async () => {
        await this.taskModel.sync();

        const pluginNamesInDb = (
          await this.taskModel.findAll({
            attributes: ['plugin'],
          })
        ).map((item) => item.plugin);

        const outdatedPlugins = [];

        for (const pluginNameInDb of pluginNamesInDb) {
          if (
            this.pluginManager.loadedPlugins.findIndex(
              (plugin) => plugin.name === pluginNameInDb
            ) === -1
          ) {
            outdatedPlugins.push(pluginNameInDb);
          }
        }

        if (outdatedPlugins.length) {
          await this.taskModel.destroy({
            where: {
              plugin: outdatedPlugins,
            },
          });
        }
      })(),
    ]);

    this.performance = performance;

    this.isReady = true;

    if (this.buffer.length) {
      this.buffer.forEach((args) => this.register(...args));

      this.buffer = [];
    }

    this.log.info('init');
  }

  /**
   *
   * @param pluginName plugin name
   * @param taskName task name
   * @param taskName
   */
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

    const data = await this.taskModel.findAll<any>({
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
          task: task,
          taskCount: taskCount,
          working: 0, // TOOD: 与正在执行中的任务进行混合
        });
      } else {
        temp[plugin] = [{task, taskCount, working: 0}];
      }
    }

    return temp;
  }

  async close() {
    this.log.info('close');
  }
}