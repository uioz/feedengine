import {Initable, Closeable} from '../types/index.js';
import {TopDeps} from '../index.js';
import {fastify, type FastifyInstance} from 'fastify';
import api from './api.js';

export class ServerManager implements Initable, Closeable {
  deps: TopDeps;
  server: FastifyInstance;

  constructor(deps: TopDeps) {
    this.deps = deps;

    this.server = fastify();

    this.server.register(api, {
      deps,
      prefix: '/api',
    });
  }

  async init() {
    await this.server.listen(await this.deps.appManager.getServerConfig());

    this.deps.debug('server init');
  }

  async close() {
    await this.server.close();

    this.deps.debug(`${ServerManager.name} close`);
  }
}
