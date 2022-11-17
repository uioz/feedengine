import {TopDeps} from './index.js';
import type {Initable, Closeable} from './types/index.js';
import {findUp} from 'find-up';
import {parse} from 'node:path';
import {readFile} from 'node:fs/promises';
import process from 'node:process';
import {AppSettings, PluginSettings} from './types/settings.js';
import {MessageType} from './types/ipc.js';

export const defaultPluginConfig: PluginSettings = {
  maxPages: 1,
  maxIo: 1,
  taskConcurrency: 1,
  pageIntervalPerTask: 5000,
  IoIntervalPerTask: 5000,
};

function diffPluginsSetting(
  settings: AppSettings['performence'],
  plugins: Array<{name: string}>
): boolean {
  let changed = false;

  const temp: AppSettings['performence']['plugins'] = [];

  for (const {name} of plugins) {
    const pos = settings.plugins.findIndex((item) => item.name === name);

    if (pos === -1) {
      temp.push({
        ...defaultPluginConfig,
        name,
      });
      changed = true;
    } else {
      temp.push(settings.plugins[pos]);
    }
  }

  if (temp.length !== settings.plugins.length || changed) {
    settings.plugins = temp;
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
  performence: {
    maxPages: 10,
    maxIo: 10,
    plugins: [],
  },
};

export class AppManager implements Initable, Closeable {
  deps: TopDeps;
  rootDir!: string;
  version!: string;
  name!: string;
  firstBooting = false;

  constructor(container: TopDeps) {
    this.deps = container;
    process.on('exit', () => this.deps.debug('exit'));
  }

  private async loadEntry() {
    const root = await findUp('package.json');

    if (root) {
      const {version, name} = JSON.parse(
        await readFile(root, {
          encoding: 'utf-8',
        })
      );

      this.version = version;

      this.name = name;

      this.rootDir = parse(root).dir;
    } else {
      throw new Error('package.json missing');
    }
  }

  private async checkSettings() {
    const result = await this.deps.settingManager.getPluginSetting<AppSettings>(this.name);

    if (!result) {
      this.firstBooting = true;

      const settings = {
        name: this.name,
        version: this.version,
        settings: defaultAppSettings,
      };

      settings.settings.performence.plugins = this.deps.pluginManager.plugins.map(({name}) => ({
        name,
        ...defaultPluginConfig,
      }));

      await this.deps.settingManager.setPluginSetting(settings);
    } else if (diffPluginsSetting(result.settings.performence, this.deps.pluginManager.plugins)) {
      this.deps.debug(`${AppManager.name} settings.performence was pruned`);

      await this.deps.settingManager.setPluginSetting(result);
    }
  }

  async getServerConfig() {
    const result = await this.deps.settingManager.getPluginSetting<AppSettings>(this.name);

    if (result) {
      return result.settings.server;
    }

    throw new Error('app settings was missing');
  }

  async getDriverConfig() {
    const result = await this.deps.settingManager.getPluginSetting<AppSettings>(this.name);

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

    await this.deps.driverManager.close();

    await this.deps.storageManager.close();

    this.deps.eventBus.all.clear();

    this.deps.debug(`${AppManager.name} close`);
  }

  async init() {
    this.deps.debug(`${AppManager.name} init`);

    await this.loadEntry();

    await Promise.all([this.deps.pluginManager.init(), this.deps.storageManager.init()]);

    await this.deps.settingManager.init();

    await this.checkSettings();

    await this.deps.driverManager.init();

    await this.deps.serverManager.init();
  }
}
