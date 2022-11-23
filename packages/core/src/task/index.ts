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
        allowNull: false,
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

        const loadedPlugins = new Set(this.pluginManager.plugins.map((item) => item.name));

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

  async close() {
    //
  }
}
