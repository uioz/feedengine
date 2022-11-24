import type {TopDeps} from '../index.js';
import {DataTypes, InferAttributes, InferCreationAttributes, Model, ModelStatic} from 'sequelize';
import type {Initable, PluginSettings} from '../types/index.js';

interface PluginSettingModel
  extends PluginSettings,
    Model<InferAttributes<PluginSettingModel>, InferCreationAttributes<PluginSettingModel>> {}

export class SettingManager implements Initable {
  storageManager: TopDeps['storageManager'];
  log: TopDeps['log'];
  pluginSettingsModel: ModelStatic<PluginSettingModel>;
  pluginSettingCache = new Map<string, any>();
  prod: boolean;

  constructor({storageManager, log, prod}: TopDeps) {
    this.storageManager = storageManager;

    this.prod = prod;

    this.log = log.child({source: SettingManager.name});

    this.pluginSettingsModel = this.storageManager.sequelize.define<PluginSettingModel>(
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
    await this.pluginSettingsModel.sync();

    this.log.info(`init`);
  }

  async getPluginSettings<T>(name: string): Promise<PluginSettings<T> | null> {
    if (this.pluginSettingCache.has(name)) {
      return this.pluginSettingCache.get(name);
    }

    const result = await this.pluginSettingsModel.findByPk<PluginSettingModel>(name);

    if (result) {
      this.pluginSettingCache.set(name, result.dataValues);
    }

    return result?.dataValues ?? null;
  }

  async setPluginSettings<T>(settings: PluginSettings<T>) {
    await this.pluginSettingsModel.upsert(settings);

    this.pluginSettingCache.set(settings.name, settings);
  }
}
