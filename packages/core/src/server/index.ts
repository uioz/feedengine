import {Initable, Closeable} from '../types/index.js';
import {TopDeps} from '../index.js';
import {fastify, type FastifyInstance} from 'fastify';
import websocket from '@fastify/websocket';
import api from './api.js';

export class ServerManager implements Initable, Closeable {
  deps: TopDeps;
  server: FastifyInstance;
  log: TopDeps['log'];

  constructor(deps: TopDeps) {
    this.deps = deps;

    this.log = deps.log.child({source: ServerManager.name});

    this.server = fastify({
      logger: this.log,
    });

    this.server.register(websocket as any);

    this.server.register(api, {
      deps,
      prefix: '/api',
    });
  }

  async init() {
    await this.server.listen(await this.deps.appManager.getServerConfig());

    this.log.info('init');
  }

  async close() {
    await this.server.close();

    this.log.info(`close`);
  }
}
