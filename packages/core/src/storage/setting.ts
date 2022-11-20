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
        },
        version: DataTypes.TEXT,
        settings: DataTypes.TEXT,
      }
    );
  }

  async init() {
    if (this.prod) {
      await this.pluginSettings.sync({alter: true});
    }

    this.log.info(`init`);
  }

  async getPluginSettings<T>(name: string): Promise<PluginSetting<T> | null> {
    if (this.pluginSettingCache.has(name)) {
      return this.pluginSettingCache.get(name);
    }

    const result = await this.pluginSettings.findByPk<PluginSettingModel>(name);

    if (result) {
      const {settings, ...rest} = result.dataValues;

      return {
        ...rest,
        settings: JSON.parse(settings),
      };
    }

    return result;
  }

  async setPluginSettings<T>({settings, ...rest}: PluginSetting<T>) {
    await this.pluginSettings.upsert({
      ...rest,
      settings: JSON.stringify(settings),
    });

    this.pluginSettingCache.set(rest.name, {settings, ...rest});
  }
}
