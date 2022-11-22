import type {FastifyPluginCallback} from 'fastify';
import {TopDeps} from '../index.js';

const plugin: FastifyPluginCallback<{deps: TopDeps}> = function (
  fastify,
  {deps: {appManager, messageManager}},
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

  fastify.get('/message', {websocket: true}, (connection) => {
    const send = async (message: any) => {
      await connection.socket.send(JSON.stringify(message));
    };

    messageManager.registerConsumer(send);

    connection.socket.on('message', (message) => {
      messageManager.consume(JSON.parse(message.toString()).id);
    });
    connection.socket.once('close', () => messageManager.unRegiserConsumer(send));
    connection.socket.once('error', () => messageManager.unRegiserConsumer(send));
  });

  done();
};

export default plugin;
