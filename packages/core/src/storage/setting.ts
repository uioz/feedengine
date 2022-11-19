import type {TopDeps} from '../index.js';
import {DataTypes, InferAttributes, InferCreationAttributes, Model, ModelStatic} from 'sequelize';
import type {Initable, PluginSetting} from '../types/index.js';

interface PluginSettingModel
  extends PluginSetting,
    Model<InferAttributes<PluginSettingModel>, InferCreationAttributes<PluginSettingModel>> {}

export class SettingManager implements Initable {
  storageManager: TopDeps['storageManager'];
  log: TopDeps['log'];
  pluginSetting: ModelStatic<PluginSettingModel>;
  pluginSettingCache = new Map<string, any>();

  constructor({storageManager, log}: TopDeps) {
    this.storageManager = storageManager;

    this.log = log.child({source: SettingManager.name});

    this.pluginSetting = this.storageManager.sequelize.define<PluginSettingModel>('PluginSetting', {
      name: {
        type: DataTypes.TEXT,
        primaryKey: true,
        unique: true,
      },
      version: DataTypes.TEXT,
      settings: DataTypes.TEXT,
    });
  }

  async init() {
    await this.pluginSetting.sync({alter: true});

    this.log.info(`init`);
  }

  async getPluginSetting<T>(name: string): Promise<PluginSetting<T> | null> {
    if (this.pluginSettingCache.has(name)) {
      return this.pluginSettingCache.get(name);
    }

    const result = await this.pluginSetting.findByPk<PluginSettingModel>(name);

    if (result) {
      const {settings, ...rest} = result.dataValues;

      return {
        ...rest,
        settings: JSON.parse(settings),
      };
    }

    return result;
  }

  async setPluginSetting<T>({settings, ...rest}: PluginSetting<T>) {
    await this.pluginSetting.upsert({
      ...rest,
      settings: JSON.stringify(settings),
    });

    this.pluginSettingCache.set(rest.name, {settings, ...rest});
  }
}
