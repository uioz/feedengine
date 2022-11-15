import {createContainer, asClass, asValue} from 'awilix';
import {AppManager} from './app.js';
import {debug} from './utils/debug.js';
import {PluginManager} from './plugins/index.js';
import {cwd} from './utils/cwd.js';
import type {Debugger} from 'debug';
import {StorageManager} from './storage/index.js';
import {SettingManager} from './storage/setting.js';
import {ServerManager} from './server/index.js';

export interface TopDeps {
  appManager: AppManager;
  pluginManager: PluginManager;
  debug: Debugger;
  storageManager: StorageManager;
  settingManager: SettingManager;
  serverManager: ServerManager;
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
  cwd: asValue(cwd),
});

contaienr.resolve('appManager').init();

// import {loadPlugins} from './plugins/index.js';

// import process from 'node:process';
// import {Message, MessageType} from './types/message.js';

// process.on('exit', () => {
//   console.log('before exit');
// });

// setTimeout(() => {
//   process.send!({
//     type: MessageType.restart,
//   } as Message);
//   process.disconnect();
//   // TODO: 通知其他所有插件进行关闭, 等待所有异步任务完成后
//   process.exit();
// }, 1000);

// 接收到退出信号后调用 closeable
// 提供几个管理器实现 initable 和 closealbe, 在 APP 中创建, 然后再 exit 后调用 close

// async function App() {
//   const plugins = await loadPlugins();

//   debug(`${plugins[0].app?.dir}`);
// }

// App();
