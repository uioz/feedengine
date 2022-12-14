import type {TopDeps} from '../index.js';
import type {AppSettings, PluginPerformanceSettings, Initable} from '../types/index.js';

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
  proxy: {
    proxyUrl: '',
  },
};

export const defaultPluginConfig: PluginPerformanceSettings = {
  maxIo: 1,
  maxTask: 1,
};

function diffAndPrunePerformance(
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

export class SettingManager implements Initable {
  storageManager: TopDeps['storageManager'];
  log: TopDeps['log'];
  pluginSettingsModel: PluginSettingModel;
  pluginModel: PluginModel;
  pluginSettingCache = new Map<string, any>();
  pluginManager: TopDeps['pluginManager'];
  appManager: TopDeps['appManager'];
  feedengine: TopDeps['feedengine'];
  reconfiguration = false;

  constructor({storageManager, log, pluginManager, appManager, feedengine}: TopDeps) {
    this.storageManager = storageManager;

    this.appManager = appManager;

    this.feedengine = feedengine;

    this.log = log.child({source: SettingManager.name});

    this.pluginSettingsModel = this.storageManager.settingsModel;

    this.pluginModel = this.storageManager.pluginModel;

    this.pluginManager = pluginManager;
  }

  async init() {
    const result = await this.getPluginSettings<AppSettings>(this.feedengine.name);

    if (result === null) {
      this.reconfiguration = true;
    } else {
      this.reconfiguration = false;
    }
  }

  async makeDefaultGlobalSettings() {
    const settings = JSON.parse(JSON.stringify(defaultAppSettings)) as AppSettings;

    diffAndPrunePerformance(settings.performance, this.pluginManager.loadedPlugins);

    return settings;
  }

  async syncGlobalSettings() {
    const result = await this.getPluginSettings<AppSettings>(this.feedengine.name);

    if (result === null) {
      const settings = {
        ...defaultAppSettings,
      };

      settings.performance.plugins = this.pluginManager.loadedPlugins.map(({name}) => ({
        name,
        ...defaultPluginConfig,
      }));

      await this.setPluginSettings(this.feedengine.name, settings);
    } else if (
      diffAndPrunePerformance(result.settings.performance, this.pluginManager.loadedPlugins)
    ) {
      this.log.info(`settings.performence was pruned`);

      await this.setPluginSettings(this.feedengine.name, result.settings);
    }
  }

  async getGlobalSettings(): Promise<AppSettings> {
    const result = await this.getPluginSettings<AppSettings>(this.feedengine.name);

    if (result) {
      return result.settings;
    }

    throw new Error();
  }

  setGlobalSettings(settings: AppSettings) {
    return this.setPluginSettings(this.feedengine.name, settings);
  }

  async updateGlobalSettings<T extends keyof AppSettings>(target: T, data: AppSettings[T]) {
    const settings = await this.getGlobalSettings();

    settings[target] = data;

    await this.setGlobalSettings(settings);
  }

  async getPluginSettings<T>(name: string): Promise<{settings: T; version: string} | null> {
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

    const settings = {
      version: result.Plugin.version,
      settings: result.dataValues.settings,
    };
    this.pluginSettingCache.set(result.Plugin.name, settings);

    return settings;
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
      PluginName: pluginName,
    });

    this.pluginSettingCache.set(pluginName, {
      version: plugin.version,
      settings,
    });
  }
}
