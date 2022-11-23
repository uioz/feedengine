import type {FastifyPluginCallback} from 'fastify';
import {TopDeps} from '../../index.js';
import websocket from '@fastify/websocket';

export const messageRoute: FastifyPluginCallback<{deps: TopDeps}> = function (
  fastify,
  {deps: {messageManager}},
  done
) {
  fastify.register(websocket as any);

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
