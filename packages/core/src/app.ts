import {TopDeps} from './index.js';
import type {Initable, Closeable} from './types/index.js';
import {findUp} from 'find-up';
import {parse} from 'node:path';
import {readFile} from 'node:fs/promises';
import process from 'node:process';
import {AppSettings} from './types/settings.js';
import {MessageType} from './types/ipc.js';

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
};

export class AppManager implements Initable, Closeable {
  deps: TopDeps;
  rootDir!: string;
  version!: string;
  name!: string;

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
      await this.deps.settingManager.setPluginSetting({
        name: this.name,
        version: this.version,
        settings: defaultAppSettings,
      });
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
    await Promise.all([this.deps.serverManager.close(), this.deps.pluginManager.close()]);

    await this.deps.storageManager.close();

    this.deps.debug(`${AppManager.name} close`);
  }

  async init() {
    this.deps.debug(`${AppManager.name} init`);

    await this.loadEntry();

    await this.deps.storageManager.init();

    await this.deps.settingManager.init();

    await this.checkSettings();

    await this.deps.driverManager.init();

    await this.deps.pluginManager.init();

    await this.deps.serverManager.init();
  }
}
