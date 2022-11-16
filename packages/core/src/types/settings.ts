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
}
