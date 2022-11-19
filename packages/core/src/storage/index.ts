import {Closeable, Initable} from '../types/index.js';
import type {TopDeps} from '../index.js';
import {Sequelize} from 'sequelize';
import {resolve} from 'node:path';

export class StorageManager implements Initable, Closeable {
  log: TopDeps['log'];
  cwd: TopDeps['cwd'];
  sequelize!: Sequelize;

  constructor({log, cwd}: TopDeps) {
    this.log = log.child({source: StorageManager.name});
    this.cwd = cwd;

    this.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: resolve(this.cwd, 'db.sqlite'),
      logging: (sql) => this.log.info(sql),
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
    return resolve(this.cwd, pluginName, taskName ?? '');
  }
}
