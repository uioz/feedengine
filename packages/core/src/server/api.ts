import type {FastifyPluginCallback} from 'fastify';
import {TopDeps} from '../index.js';

const plugin: FastifyPluginCallback<{deps: TopDeps}> = function (
  fastify,
  {deps: {appManager, cwd}},
  done
) {
  fastify.get('/', (req, res) => {
    res.send(cwd);
  });

  fastify.get('/restart', (req, res) => {
    res.status(200).send();

    appManager.restart();
  });

  fastify.get('/close', (req, res) => {
    res.status(200).send();

    appManager.close();
  });

  done();
};

export default plugin;
