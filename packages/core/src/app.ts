import {TopDeps} from './index.js';
import type {Initable, Closeable} from './types/index.js';
import process from 'node:process';
import {AppSettings, PluginPerformanceSettings} from './types/settings.js';

export enum MessageType {
  'restart',
}

export const defaultPluginConfig: PluginPerformanceSettings = {
  maxIo: 1,
  maxTask: 1,
};

function diffPluginsSetting(
  performance: AppSettings['performance'],
  plugins: Array<{name: string}>
): boolean {
  let changed = false;

  const temp: AppSettings['performance']['plugins'] = [];

  for (const {name} of plugins) {
    const pos = performance.plugins.findIndex((item) => item.name === name);

    if (pos === -1) {
      temp.push({
        ...defaultPluginConfig,
        name,
      });
      changed = true;
    } else {
      temp.push(performance.plugins[pos]);
    }
  }

  if (temp.length !== performance.plugins.length || changed) {
    performance.plugins = temp;
    return true;
  }

  return false;
}

export const defaultAppSettings: AppSettings = {
  server: {
    host: '127.0.0.1',
    port: 8080,
  },
  driver: {
    headless: false,
    executablePath: '',
    userDataDir: '',
  },
  performance: {
    pagesConcurrency: 10,
    ioConcurrency: 10,
    taskConcurrency: 1,
    plugins: [],
  },
};

export class AppManager implements Initable, Closeable {
  deps: TopDeps;
  firstBooting = false;
  log: TopDeps['log'];

  constructor(container: TopDeps) {
    this.deps = container;
    this.log = container.log.child({source: AppManager.name});
    process.on('exit', () => this.log.info('exit'));
  }

  private async checkSettings() {
    const result = await this.deps.settingManager.getPluginSettings<AppSettings>(
      this.deps.feedengine.name
    );

    if (!result) {
      this.firstBooting = true;

      const settings = {
        name: this.deps.feedengine.name,
        version: this.deps.feedengine.version,
        settings: defaultAppSettings,
      };

      settings.settings.performance.plugins = this.deps.pluginManager.plugins.map(({name}) => ({
        name,
        ...defaultPluginConfig,
      }));

      await this.deps.settingManager.setPluginSettings(settings);
    } else if (diffPluginsSetting(result.settings.performance, this.deps.pluginManager.plugins)) {
      this.log.info(`settings.performence was pruned`);

      await this.deps.settingManager.setPluginSettings(result);
    }
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

  async restart() {
    await this.close();

    process.send!({
      type: MessageType.restart,
    });

    process.disconnect();
  }

  async close() {
    await this.deps.pluginManager.close();

    await this.deps.messageManager.close();

    await this.deps.serverManager.close();

    if (!this.firstBooting) {
      await this.deps.driverManager.close();
    }

    await this.deps.storageManager.close();

    this.deps.eventBus.all.clear();

    this.log.info(`close`);
  }

  async init() {
    this.log.info(`init`);

    await this.deps.pluginManager.init();

    await Promise.all([
      this.deps.storageManager.init(),
      this.deps.settingManager.init(),
      this.deps.taskManager.init(),
    ]);

    await this.checkSettings();

    if (!this.firstBooting) {
      // await this.deps.driverManager.init();
    }

    this.deps.pluginManager.create();

    await this.deps.serverManager.init();
  }
}
