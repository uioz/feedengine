import {TopDeps} from './index.js';
import type {Initable, Closeable, AppSettings} from './types/index.js';
import process from 'node:process';
import {PluginState} from './plugins/index.js';
import {defaultAppSettings} from './storage/setting.js';

export enum MessageType {
  'restart',
}

export class AppManager implements Initable, Closeable {
  deps: TopDeps;
  log: TopDeps['log'];

  constructor(container: TopDeps) {
    this.deps = container;
    this.log = container.log.child({source: AppManager.name});
    process.on('exit', () => this.log.info('exit'));
  }

  async getServerConfig() {
    const result = await this.deps.settingManager.getPluginSettings<AppSettings>(
      this.deps.feedengine.name
    );

    if (result) {
      return result.settings.server;
    } else if (this.deps.settingManager.reconfiguration) {
      return defaultAppSettings.server;
    }

    throw new Error('app settings was missing');
  }

  async getDriverConfig() {
    const result = await this.deps.settingManager.getPluginSettings<AppSettings>(
      this.deps.feedengine.name
    );

    if (result) {
      return result.settings.driver;
    } else if (this.deps.settingManager.reconfiguration) {
      return defaultAppSettings.driver;
    }

    throw new Error('app settings was missing');
  }

  async getPerformance() {
    const result = await this.deps.settingManager.getPluginSettings<AppSettings>(
      this.deps.feedengine.name
    );

    if (result) {
      return result.settings.performance;
    } else if (this.deps.settingManager.reconfiguration) {
      return defaultAppSettings.performance;
    }

    throw new Error('app settings was missing');
  }

  async getProxy() {
    const result = await this.deps.settingManager.getPluginSettings<AppSettings>(
      this.deps.feedengine.name
    );

    if (result) {
      return result.settings.proxy;
    } else if (this.deps.settingManager.reconfiguration) {
      return defaultAppSettings.proxy;
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
    const reconfiguration = this.deps.settingManager.reconfiguration;

    if (!reconfiguration) {
      await this.deps.scheduleManager.close();
      await this.deps.taskManager.close();
      await this.deps.driverManager.close();
    }

    await this.deps.pluginManager.close();

    await this.deps.messageManager.close();

    await this.deps.serverManager.close();

    await this.deps.storageManager.close();

    this.log.info(`close`);
  }

  async init() {
    this.log.info(`init`);

    await Promise.all([this.deps.storageManager.init(), this.deps.pluginManager.loadPlugins()]);

    await this.deps.settingManager.init();

    const reconfiguration = this.deps.settingManager.reconfiguration;

    if (!reconfiguration) {
      await this.deps.taskManager.init();
    }

    await this.deps.pluginManager.init();

    if (!reconfiguration) {
      await this.deps.driverManager.init();
      this.deps.pluginManager.hook.once(`all-${PluginState[PluginState.actived]}`, () => {
        this.deps.scheduleManager.active();
      });
    }

    this.deps.pluginManager.create();

    await this.deps.serverManager.init();
  }
}
