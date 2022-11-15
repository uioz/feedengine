export interface Context {
  // skip eslint
  placeholder: null;
}

export interface PluginOptions {
  onCreate?: () => void;
  onActive?: () => void;
  onDispose?: () => void;
}

export interface App {
  settingUrl?: string;
  dir: string;
}

export type OptionsConstructor = (context: Context) => PluginOptions;

export interface Plugin {
  app?: App;
  options?: OptionsConstructor;
}
