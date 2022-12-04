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

  private async checkDatabase() {
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

    try {
      await this.deps.storageManager.pluginModel.bulkCreate(
        this.deps.pluginManager.loadedPlugins.map(({name, version}) => ({name, version}))
      );
    } catch (error) {
      //
    }

    await this.deps.settingManager.checkGlobalSettings();
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

    await Promise.all([this.deps.pluginManager.init(), this.deps.storageManager.init()]);

    await this.checkDatabase();

    await this.deps.taskManager.init();

    if (!this.firstBooting) {
      // await this.deps.driverManager.init();
    }

    this.deps.pluginManager.create();

    this.deps.pluginManager.hook.once(`all-${PluginState[PluginState.actived]}`, () => {
      this.deps.taskManager.active();
      this.deps.scheduleManager.active();
    });

    await this.deps.serverManager.init();
  }
}
