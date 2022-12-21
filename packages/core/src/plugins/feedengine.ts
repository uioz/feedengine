import {TopDeps} from 'feedengine';
import {PluginContext, PluginOptions} from '../types/index.js';

export const plugin = (context: PluginContext, deps: TopDeps): PluginOptions => ({
  async onCreate() {
    await deps.storageManager.pluginModel.upsert({
      name: deps.feedengine.name,
      version: deps.feedengine.version,
    });
  },
});
