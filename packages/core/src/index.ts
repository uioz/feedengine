import {createContainer, asClass, asValue} from 'awilix';
import {AppManager} from './app.js';
import {debug} from './utils/debug.js';
import {PluginManager} from './plugins/index.js';
import {cwd} from './utils/cwd.js';
import type {Debugger} from 'debug';
import {StorageManager} from './storage/index.js';
import {SettingManager} from './storage/setting.js';
import {ServerManager} from './server/index.js';
import {DriverManager} from './driver/index.js';
import {eventBus, type Eventbus} from './event/index.js';
import {MessageManager} from './message/index.js';

export interface TopDeps {
  appManager: AppManager;
  pluginManager: PluginManager;
  debug: Debugger;
  storageManager: StorageManager;
  settingManager: SettingManager;
  serverManager: ServerManager;
  driverManager: DriverManager;
  eventBus: Eventbus;
  messageManager: MessageManager;
  cwd: string;
}

const contaienr = createContainer<TopDeps>();

contaienr.register({
  appManager: asClass(AppManager).singleton(),
  pluginManager: asClass(PluginManager).singleton(),
  debug: asValue(debug),
  storageManager: asClass(StorageManager).singleton(),
  settingManager: asClass(SettingManager).singleton(),
  serverManager: asClass(ServerManager).singleton(),
  driverManager: asClass(DriverManager).singleton(),
  eventBus: asValue(eventBus),
  messageManager: asClass(MessageManager).singleton(),
  cwd: asValue(cwd),
});

contaienr.resolve('appManager').init();
