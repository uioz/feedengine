import {TopDeps} from './index.js';
import type {Initable} from './types/index.js';
import {findUp} from 'find-up';
import {parse} from 'node:path';
import {readFile} from 'node:fs/promises';
import process from 'node:process';
import {AppSettings} from './types/settings.js';

export const defaultAppSettings: AppSettings = {
  color: 'default',
};

export class AppManager implements Initable {
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

  async init() {
    await this.loadEntry();

    await this.deps.storageManager.init();

    await this.deps.settingManager.init();

    await this.deps.settingManager.getPluginSetting(this.name, {
      name: this.name,
      version: this.version,
      settings: defaultAppSettings,
    });

    await this.deps.pluginManager.init();
  }
}
