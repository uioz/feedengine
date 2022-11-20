import {Closeable, Initable} from '../types/index.js';
import type {TopDeps} from '../index.js';
import {Sequelize} from 'sequelize';
import {resolve} from 'node:path';

export class StorageManager implements Initable, Closeable {
  log: TopDeps['log'];
  rootDir: string;
  sequelize!: Sequelize;

  constructor({log, feedengine: {rootDir}}: TopDeps) {
    this.log = log.child({source: StorageManager.name});
    this.rootDir = rootDir;

    this.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: resolve(this.rootDir, 'db.sqlite'),
      logging: (sql) => this.log.info(sql),
      define: {
        freezeTableName: true,
      },
    });
  }

  async init() {
    await this.sequelize.authenticate();

    this.log.info(`init`);
  }

  async close() {
    await this.sequelize.close();

    this.log.info(`close`);
  }

  getWorkspace(pluginName: string, taskName?: string) {
    return resolve(this.rootDir, pluginName, taskName ?? '');
  }
}
