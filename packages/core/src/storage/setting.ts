import type {TopDeps} from '../index.js';
import type {PluginSettings, AppSettings, PluginPerformanceSettings} from '../types/index.js';

type PluginSettingModel = TopDeps['storageManager']['settingsModel'];
type PluginModel = TopDeps['storageManager']['pluginModel'];

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

export class SettingManager {
  storageManager: TopDeps['storageManager'];
  log: TopDeps['log'];
  pluginSettingsModel: PluginSettingModel;
  pluginModel: PluginModel;
  pluginSettingCache = new Map<string, any>();
  pluginManager: TopDeps['pluginManager'];
  appManager: TopDeps['appManager'];
  feedengine: TopDeps['feedengine'];

  constructor({storageManager, log, pluginManager, appManager, feedengine}: TopDeps) {
    this.storageManager = storageManager;

    this.appManager = appManager;

    this.feedengine = feedengine;

    this.log = log.child({source: SettingManager.name});

    this.pluginSettingsModel = this.storageManager.settingsModel;

    this.pluginModel = this.storageManager.pluginModel;

    this.pluginManager = pluginManager;
  }

  async checkGlobalSettings() {
    const result = await this.getPluginSettings<AppSettings>(this.feedengine.name);

    if (result === null) {
      this.appManager.firstBooting = true;

      const settings = {
        name: this.feedengine.name,
        version: this.feedengine.version,
        settings: defaultAppSettings,
      };

      settings.settings.performance.plugins = this.pluginManager.loadedPlugins.map(({name}) => ({
        name,
        ...defaultPluginConfig,
      }));

      await this.setPluginSettings(this.feedengine.name, settings.settings);
    } else if (diffPluginsSetting(result.settings.performance, this.pluginManager.loadedPlugins)) {
      this.log.info(`settings.performence was pruned`);

      await this.setPluginSettings(this.feedengine.name, result.settings);
    }
  }

  async getPluginSettings<T>(name: string): Promise<PluginSettings<T> | null> {
    if (this.pluginSettingCache.has(name)) {
      return this.pluginSettingCache.get(name);
    }

    const result = await this.pluginSettingsModel.findOne({
      include: {
        model: this.pluginModel,
        required: true,
        where: {
          name,
        },
      },
    });

    if (result === null) {
      return result;
    }

    const temp = {
      name: result.Plugin.name,
      version: result.Plugin.version,
      settings: result.settings,
    };

    this.pluginSettingCache.set(result.Plugin.name, temp);

    return temp;
  }

  async setPluginSettings(pluginName: string, settings: unknown) {
    const plugin = await this.pluginModel.findOne({
      where: {
        name: pluginName,
      },
    });

    if (plugin === null) {
      throw new Error('');
    }

    await this.pluginSettingsModel.upsert({
      settings,
      PluginId: plugin.id,
    });

    this.pluginSettingCache.set(pluginName, {
      name: pluginName,
      version: plugin.version,
      settings: settings,
    });
  }
}
