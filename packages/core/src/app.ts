import {TopDeps} from './index.js';
import type {Initable, Closeable, AppSettings} from './types/index.js';
import process from 'node:process';
import {PluginState} from './plugins/index.js';

export enum MessageType {
  'restart',
}

export class AppManager implements Initable, Closeable {
  deps: TopDeps;
  firstBooting = false;
  log: TopDeps['log'];

  constructor(container: TopDeps) {
    this.deps = container;
    this.log = container.log.child({source: AppManager.name});
    process.on('exit', () => this.log.info('exit'));
  }

  private async syncPlugins() {
    this.firstBooting =
      (await this.deps.storageManager.pluginModel.findOne({
        where: {
          name: this.deps.feedengine.name,
        },
      })) === null;

    if (this.firstBooting) {
      await this.deps.storageManager.pluginModel.create({
        name: this.deps.feedengine.name,
        version: this.deps.feedengine.version,
      });
    }

    await this.deps.storageManager.pluginModel.bulkCreate(
      this.deps.pluginManager.loadedPlugins.map(({name, version}) => ({name, version})),
      {
        ignoreDuplicates: true,
      }
    );
  }

  async getServerConfig() {
    const result = await this.deps.settingManager.getPluginSettings<AppSettings>(
      this.deps.feedengine.name
    );

    if (result) {
      return result.settings.server;
    }

    throw new Error('app settings was missing');
  }

  async getDriverConfig() {
    const result = await this.deps.settingManager.getPluginSettings<AppSettings>(
      this.deps.feedengine.name
    );

    if (result) {
      return result.settings.driver;
    }

    throw new Error('app settings was missing');
  }

  async getPerformance() {
    const result = await this.deps.settingManager.getPluginSettings<AppSettings>(
      this.deps.feedengine.name
    );

    if (result) {
      return result.settings.performance;
    }

    throw new Error('app settings was missing');
  }

  async getProxy() {
    const result = await this.deps.settingManager.getPluginSettings<AppSettings>(
      this.deps.feedengine.name
    );

    if (result) {
      return result.settings.proxy;
    }

    throw new Error('app settings was missing');
  }

  async restart() {
    await this.close();

    process.send!({
      type: MessageType.restart,
    });

    process.disconnect();
  }

  async close() {
    await this.deps.taskManager.close();

    await this.deps.pluginManager.close();

    await this.deps.messageManager.close();

    await this.deps.serverManager.close();

    await this.deps.storageManager.close();

    this.log.info(`close`);
  }

  async init() {
    this.log.info(`init`);

    await Promise.all([this.deps.storageManager.init(), this.deps.pluginManager.loadPlugins()]);

    await Promise.all([this.syncPlugins(), this.deps.settingManager.syncGlobalSettings()]);

    await this.deps.taskManager.init();

    await this.deps.pluginManager.init();

    // TODO: 如果首次启动, 禁止一切非核心插件的启动
    if (!this.firstBooting) {
      await this.deps.driverManager.init();
    }

    this.deps.pluginManager.hook.once(`all-${PluginState[PluginState.actived]}`, () => {
      this.deps.taskManager.active();
      this.deps.scheduleManager.active();
    });

    await this.deps.storageManager.sequelize.sync();

    this.deps.pluginManager.create();

    await this.deps.serverManager.init();
  }
}
