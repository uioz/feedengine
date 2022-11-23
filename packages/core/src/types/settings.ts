export interface PluginPerformanceSettings {
  maxIo: number; // 1 by default
  maxTask: number; // 1 by default
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
  performance: {
    pagesConcurrency: number; // 10 by default
    ioConcurrency: number; // 10 by default
    taskConcurrency: number; // 1 by default
    plugins: Array<PluginPerformanceSettings & {name: string}>;
  };
}

export interface PluginSettings<T = any> {
  name: string;
  version: string;
  settings: T;
}
