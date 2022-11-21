import {definePlugin} from 'feedengine-plugin';
import type {PluginState as PS} from 'feedengine';
import {TypeBoxTypeProvider} from '@fastify/type-provider-typebox';

export interface PluginState {
  name: string;
  version: string;
  state: PS;
  app?: {
    url: string;
    settings?: string | true;
  };
}

export type PluginsState = Array<PluginState>;

export const plugin = definePlugin<true>(({registerFastifyPlugin, name}, {pluginManager}) => {
  registerFastifyPlugin(function (fastify, opts, done) {
    fastify.withTypeProvider<TypeBoxTypeProvider>();

    fastify.get<{Reply: PluginsState}>('/plugins/state', (req, res) => {
      res.status(200).send(
        pluginManager.plugins
          .filter((item) => item.name !== name)
          .map(({name, version, dir, baseUrl, settingUrl, state}) => {
            const temp: PluginState = {
              name,
              version,
              state,
            };

            if (dir) {
              temp.app = {
                url: baseUrl,
                settings: settingUrl,
              };
            }

            return temp;
          })
      );
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
