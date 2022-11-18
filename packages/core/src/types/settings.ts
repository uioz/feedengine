export interface PluginSettings {
  maxPages: number; // 1 by default
  maxIo: number; // 1 by default
  taskConcurrency: number; // 1 by default
  pageIntervalPerTask: number; // 5000 by default
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
    maxPages: number; // 10 by default
    maxIo: number; // 10 by default
    plugins: Array<PluginSettings & {name: string}>;
  };
}

export interface PluginSetting<T = string> {
  name: string;
  version: string;
  settings: T;
}
