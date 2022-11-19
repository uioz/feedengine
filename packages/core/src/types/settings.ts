export interface PluginSettings {
  maxIo: number; // 1 by default
  maxTask: number; // 1 by default
  IoIntervalPerTask: number; // 5000 by default
}

export interface AppSettings {
  server: {
    host: string;
    port: number;
  };
  driver: {
    headless: boolean;
    executablePath: string;
    userDataDir: string;
  };
  performence: {
    pagesConcurrency: number; // 10 by default
    ioConcurrency: number; // 10 by default
    taskConcurrency: number; // 1 by default
    plugins: Array<PluginSettings & {name: string}>;
  };
}

export interface PluginSetting<T = string> {
  name: string;
  version: string;
  settings: T;
}
