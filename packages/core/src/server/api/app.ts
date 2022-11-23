import type {FastifyPluginCallback} from 'fastify';
import {TopDeps} from '../../index.js';

export const appRoute: FastifyPluginCallback<{deps: TopDeps}> = function (
  fastify,
  {deps: {appManager}},
  done
) {
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
