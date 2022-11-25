export * from './types/index.js';
import {createContainer, asClass, asValue, asFunction} from 'awilix';
import {AppManager} from './app.js';
import {PluginManager} from './plugins/index.js';
import {findRootDir} from './utils/cwd.js';
import {StorageManager} from './storage/index.js';
import {SettingManager} from './storage/setting.js';
import {ServerManager} from './server/index.js';
import {DriverManager} from './driver/index.js';
import {MessageManager} from './message/index.js';
import {log, type Log} from './utils/log.js';
import {TaskManager} from './task/index.js';
import {ScheduleManager} from './schedule/index.js';
import {env} from 'node:process';

const feedengine = await findRootDir();

export interface TopDeps {
  appManager: AppManager;
  pluginManager: PluginManager;
  storageManager: StorageManager;
  settingManager: SettingManager;
  serverManager: ServerManager;
  driverManager: DriverManager;
  messageManager: MessageManager;
  taskManager: TaskManager;
  scheduleManager: ScheduleManager;
  feedengine: {
    rootDir: string;
    name: string;
    version: string;
  };
  log: Log;
  prod: boolean;
}

const contaienr = createContainer<TopDeps>();

contaienr.register({
  appManager: asClass(AppManager).singleton(),
  pluginManager: asClass(PluginManager).singleton(),
  storageManager: asClass(StorageManager).singleton(),
  settingManager: asClass(SettingManager).singleton(),
  serverManager: asClass(ServerManager).singleton(),
  driverManager: asClass(DriverManager).singleton(),
  messageManager: asClass(MessageManager).singleton(),
  taskManager: asClass(TaskManager).singleton(),
  scheduleManager: asClass(ScheduleManager).singleton(),
  log: asFunction(log).singleton(),
  feedengine: asValue(feedengine),
  prod: asValue(env.NODE_ENV === 'production'),
});

contaienr.resolve('appManager').init();
