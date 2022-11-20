import {definePlugin} from 'feedengine-plugin';

export const plugin = definePlugin(({log, registerFastifyPlugin}) => {
  registerFastifyPlugin(function (fastify, opts, done) {
    fastify.get('/test', (req, res) => {
      log.info('success');
      res.send(req.url);
    });

    done();
  });

  return {
    app: {
      dir: './dist',
      type: 'spa',
    },
  };
});
