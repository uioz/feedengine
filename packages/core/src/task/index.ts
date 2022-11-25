import type {
  Closeable,
  TaskConstructor,
  PluginPerformanceSettings,
  AppSettings,
  Initable,
  TaskTableDefinition,
} from '../types/index.js';
import type {TopDeps} from '../index.js';
import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  ModelStatic,
  QueryTypes,
} from 'sequelize';

interface TaskMeta {
  pluginName: string;
  taskName: string;
  pluginPerformanceSettings: PluginPerformanceSettings;
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
  buffer: Array<[string, string, TaskConstructor<unknown>]> = [];
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
    const [performance] = await Promise.all([
      this.appManager.getPerformance(),
      (async () => {
        await this.taskModel.sync();

        const pluginsInDb = new Set(
          (
            await this.taskModel.findAll({
              attributes: ['plugin'],
            })
          ).map((item) => item.plugin)
        );

        const outdatedPlugins = [];

        for (const pluginInDb of pluginsInDb) {
          if (
            !this.pluginManager.pluginSuccessNames.has(pluginInDb) &&
            !this.pluginManager.pluginFailedNames.has(pluginInDb)
          ) {
            outdatedPlugins.push(pluginInDb);
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
  register(pluginName: string, taskName: string, task: TaskConstructor<any>) {
    if (this.isReady) {
      this.allregisteredTask.set(`${pluginName}@${taskName}`, {
        task,
        pluginName,
        taskName,
        pluginPerformanceSettings: this.performance.plugins.find(
          (item) => item.name === pluginName
        )!,
      });
    } else {
      this.buffer.push([pluginName, taskName, task]);
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

  async getAllTask(): Promise<Array<TaskTableDefinition>> {
    const tasks = await this.taskModel.findAll();

    return tasks.map((item) => item.dataValues);
  }

  async getAllTaskStateGroupByPlugin() {
    const result = await this.taskModel.sequelize!.query<{
      plugin: string;
      task: string;
      taskCount: number;
    }>(
      `SELECT plugin, task, COUNT(task) AS taskCount FROM ${taskTableName} AS test GROUP BY plugin, task`,
      {type: QueryTypes.SELECT}
    );

    const temp: Record<string, Array<{task: string; taskCount: number; working: number}>> = {};

    for (const {plugin, task, taskCount} of result) {
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
    //
  }
}
