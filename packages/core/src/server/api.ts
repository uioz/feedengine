import type {FastifyPluginCallback} from 'fastify';
import {TopDeps} from '../index.js';

const plugin: FastifyPluginCallback<{deps: TopDeps}> = function (fastify, {deps}, done) {
  fastify.get('/', (req, res) => {
    res.send(deps.cwd);
  });

  fastify.get('/restart', (req, res) => {
    res.status(200).send();

    deps.appManager.restart();
  });

  fastify.get('/close', (req, res) => {
    res.status(200).send();

    deps.appManager.close();
  });

  done();
};

export default plugin;
