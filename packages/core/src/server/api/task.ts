import type {FastifyPluginCallback} from 'fastify';
import {TopDeps, TasksApi} from '../../index.js';
// TODO: 阻止那些加载失败插件的任务的执行

export const pluginRoute: FastifyPluginCallback<{deps: TopDeps}> = function (
  fastify,
  {deps: {taskManager}},
  done
) {
  fastify.get<{Reply: TasksApi}>('/tasks', async (req, res) => {
    res.send(await taskManager.getAllRegisterTaskGroupByPlugin());
  });

  done();
};
