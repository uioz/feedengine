import type {FastifyPluginCallback} from 'fastify';
import {TopDeps, PluginStateApi} from '../../index.js';

export const pluginRoute: FastifyPluginCallback<{deps: TopDeps}> = function (
  fastify,
  {deps: {pluginManager, taskManager}},
  done
) {
  fastify.get<{Reply: Array<PluginStateApi>}>('/plugins/state', async (req, res) => {
    const allTasks = await taskManager.getAllTaskStateGroupByPlugin();

    return res.status(200).send(
      pluginManager.plugins.map(({name, version, dir, baseUrl, settingUrl, state}) => {
        const temp: PluginStateApi = {
          name,
          version,
          state,
          task: allTasks[name] ?? [],
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
};
