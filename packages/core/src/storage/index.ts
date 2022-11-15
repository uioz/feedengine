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
  }

  async init() {
    this.debug(`${StorageManager.name} init`);

    this.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: resolve(this.cwd, 'db.sqlite'),
      logging: this.debug,
    });

    await this.sequelize.authenticate();
  }

  async close() {
    this.debug(`${StorageManager.name} close`);

    await this.sequelize.close();
  }
}
