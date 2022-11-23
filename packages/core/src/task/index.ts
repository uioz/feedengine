import type {
  Closeable,
  TaskConstructor,
  TaskRegisterOptions,
  PluginPerformanceSettings,
  AppSettings,
  Initable,
  TaskTableDefinition,
} from '../types/index.js';
import type {TopDeps} from '../index.js';
import {Model, InferAttributes, InferCreationAttributes, DataTypes, ModelStatic} from 'sequelize';

interface TaskMeta {
  options: TaskRegisterOptions;
  pluginName: string;
  taskName: string;
  pluginPerformanceSettings: PluginPerformanceSettings;
  task: TaskConstructor;
}

interface TaskModel
  extends TaskTableDefinition,
    Model<InferAttributes<TaskModel>, InferCreationAttributes<TaskModel>> {}

export class TaskManager implements Initable, Closeable {
  log: TopDeps['log'];
  messageManager: TopDeps['messageManager'];
  pluginManager: TopDeps['pluginManager'];
  settingManager: TopDeps['settingManager'];
  feedengineMeta: TopDeps['feedengine'];
  allregisteredTask = new Map<string, TaskMeta>();
  performance!: AppSettings['performance'];
  taskModel: ModelStatic<TaskModel>;
  buffer: Array<[string, string, TaskRegisterOptions, TaskConstructor]> = [];
  isReady = false;

  constructor({
    log,
    messageManager,
    pluginManager,
    settingManager,
    feedengine,
    storageManager,
  }: TopDeps) {
    this.log = log.child({source: TaskManager.name});
    this.messageManager = messageManager;
    this.pluginManager = pluginManager;
    this.settingManager = settingManager;
    this.feedengineMeta = feedengine;

    this.taskModel = storageManager.sequelize.define<TaskModel>('task', {
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
    const [AppSettings] = await Promise.all([
      this.settingManager.getPluginSettings<AppSettings>(this.feedengineMeta.name),
      (async () => {
        await this.taskModel.sync();

        const pluginsInDb = new Set(
          (
            await this.taskModel.findAll({
              attributes: ['plugin'],
            })
          ).map((item) => item.plugin)
        );

        const loadedPlugins = this.pluginManager.pluginSuccessNames;

        const outdatedPlugins = [];

        for (const pluginInDb of pluginsInDb) {
          if (!loadedPlugins.has(pluginInDb)) {
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

    this.performance = AppSettings!.settings.performance;

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
   * @param options
   * @param taskName
   */
  register(
    pluginName: string,
    taskName: string,
    options: TaskRegisterOptions,
    task: TaskConstructor
  ) {
    if (this.isReady) {
      this.allregisteredTask.set(`${pluginName}@${taskName}`, {
        task,
        options,
        pluginName,
        taskName,
        pluginPerformanceSettings: this.performance.plugins.find(
          (item) => item.name === pluginName
        )!,
      });
    } else {
      this.buffer.push([pluginName, taskName, options, task]);
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
    // 获取注册中的任务, 根据对应的插件名称过滤后, 同插件同任务的不同任务 id
    // 在获取运行中的同插件同类型的任务混合到一起得到任务总数与运行中总数

    const tasks = await this.taskModel.findAll();

    return tasks.map((item) => item.dataValues);
  }

  async getAllTaskSortByPlugin() {
    const tasks = await this.getAllTask();

    const data: Record<string, Array<{task: string; name?: string; id: number}>> = {};

    for (const {plugin, name, id, task} of tasks) {
      if (data[plugin]) {
        data[plugin].push({
          name,
          task,
          id,
        });
      } else {
        data[plugin] = [
          {
            name,
            task,
            id,
          },
        ];
      }
    }

    return data;
  }

  async close() {
    //
  }
}
