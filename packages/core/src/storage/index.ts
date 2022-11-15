import {Closeable, Initable} from '../types/index.js';
import type {TopDeps} from '../index.js';
import {Sequelize} from 'sequelize';
import {resolve} from 'node:path';

export class StorageManager implements Initable, Closeable {
  debug: TopDeps['debug'];
  cwd: TopDeps['cwd'];
  sequelize!: Sequelize;

  constructor({debug, cwd}: TopDeps) {
    this.debug = debug;
    this.cwd = cwd;

    this.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: resolve(this.cwd, 'db.sqlite'),
      logging: (sql) => this.debug(sql),
    });
  }

  async init() {
    await this.sequelize.authenticate();

    this.debug(`${StorageManager.name} init`);
  }

  async close() {
    await this.sequelize.close();

    this.debug(`${StorageManager.name} close`);
  }

  getWorkspace(pluginName: string, taskName?: string) {
    return resolve(this.cwd, pluginName, taskName ?? '');
  }
}
