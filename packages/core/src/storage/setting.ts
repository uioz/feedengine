import type {TopDeps} from '../index.js';
import {InferAttributes, InferCreationAttributes, Model, ModelStatic} from 'sequelize';
import type {PluginSettings} from '../types/index.js';

interface PluginSettingModel
  extends PluginSettings,
    Model<InferAttributes<PluginSettingModel>, InferCreationAttributes<PluginSettingModel>> {}

export class SettingManager {
  storageManager: TopDeps['storageManager'];
  log: TopDeps['log'];
  pluginSettingsModel: ModelStatic<PluginSettingModel>;
  pluginSettingCache = new Map<string, any>();
  prod: boolean;

  constructor({storageManager, log, prod}: TopDeps) {
    this.storageManager = storageManager;

    this.prod = prod;

    this.log = log.child({source: SettingManager.name});

    this.pluginSettingsModel = this.storageManager.settingsModel;
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
