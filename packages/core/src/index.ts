export * from './types/index.js';
import {createContainer, asClass, asValue, asFunction} from 'awilix';
import {AppManager} from './app.js';
import {PluginManager} from './plugins/index.js';
import {cwd} from './utils/cwd.js';
import {StorageManager} from './storage/index.js';
import {SettingManager} from './storage/setting.js';
import {ServerManager} from './server/index.js';
import {DriverManager} from './driver/index.js';
import {eventBus, type Eventbus} from './event/index.js';
import {MessageManager} from './message/index.js';
import {log, type Log} from './utils/log.js';

export interface TopDeps {
  appManager: AppManager;
  pluginManager: PluginManager;
  storageManager: StorageManager;
  settingManager: SettingManager;
  serverManager: ServerManager;
  driverManager: DriverManager;
  eventBus: Eventbus;
  messageManager: MessageManager;
  cwd: string;
  log: Log;
}

const contaienr = createContainer<TopDeps>();

contaienr.register({
  appManager: asClass(AppManager).singleton(),
  pluginManager: asClass(PluginManager).singleton(),
  storageManager: asClass(StorageManager).singleton(),
  settingManager: asClass(SettingManager).singleton(),
  serverManager: asClass(ServerManager).singleton(),
  driverManager: asClass(DriverManager).singleton(),
  eventBus: asValue(eventBus),
  messageManager: asClass(MessageManager).singleton(),
  log: asFunction(log).singleton(),
  cwd: asValue(cwd),
});

contaienr.resolve('appManager').init();
