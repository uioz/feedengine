import type {FastifyPluginCallback} from 'fastify';
import {TopDeps, LivingApi} from '../../index.js';
import {PluginState} from '../../plugins/index.js';

export const pluginRoute: FastifyPluginCallback<{deps: TopDeps}> = function (
  fastify,
  {deps: {pluginManager, taskManager}},
  done
) {
  fastify.get<{Reply: Array<LivingApi>}>('/living', async (req, res) => {
    const allTasks = await taskManager.getAllLivingTaskStatusGroupByPlugin();

    return res.status(200).send(
      pluginManager.loadedPlugins.map(({name, version, dir, baseUrl, settingUrl, state}) => {
        const temp: LivingApi = {
          name,
          version,
          state: PluginState[state] as never,
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
