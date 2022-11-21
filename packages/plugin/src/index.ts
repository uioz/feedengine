import type {PluginOptionsConstructor} from 'feedengine';

export function definePlugin<IsCorePlugin = false>(
  options: PluginOptionsConstructor<IsCorePlugin>
): PluginOptionsConstructor<IsCorePlugin> {
  return options;
}
