import type {TopDeps} from '../index.js';
import {DataTypes, InferAttributes, InferCreationAttributes, Model, ModelStatic} from 'sequelize';
import type {Initable, PluginSetting} from '../types/index.js';

interface PluginSettingModel
  extends PluginSetting,
    Model<InferAttributes<PluginSettingModel>, InferCreationAttributes<PluginSettingModel>> {}

export class SettingManager implements Initable {
  storageManager: TopDeps['storageManager'];
  log: TopDeps['log'];
  pluginSettings: ModelStatic<PluginSettingModel>;
  pluginSettingCache = new Map<string, any>();
  prod: boolean;

  constructor({storageManager, log, prod}: TopDeps) {
    this.storageManager = storageManager;

    this.prod = prod;

    this.log = log.child({source: SettingManager.name});

    this.pluginSettings = this.storageManager.sequelize.define<PluginSettingModel>(
      'PluginSettings',
      {
        name: {
          type: DataTypes.TEXT,
          primaryKey: true,
          unique: true,
          allowNull: false,
        },
        version: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        settings: {
          type: DataTypes.JSON,
          allowNull: false,
        },
      }
    );
  }

  async init() {
    await this.pluginSettings.sync();

    this.log.info(`init`);
  }

  async getPluginSettings<T>(name: string): Promise<PluginSetting<T> | null> {
    if (this.pluginSettingCache.has(name)) {
      return this.pluginSettingCache.get(name);
    }

    const result = await this.pluginSettings.findByPk<PluginSettingModel>(name);

    return result?.dataValues ?? null;
  }

  async setPluginSettings<T>(settings: PluginSetting<T>) {
    await this.pluginSettings.upsert(settings);

    this.pluginSettingCache.set(settings.name, settings);
  }
}
