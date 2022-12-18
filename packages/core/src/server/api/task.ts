import type {FastifyPluginCallback} from 'fastify';
import {TopDeps, GroupedTasksRes, TasksRes} from '../../index.js';
// TODO: 阻止那些加载失败插件的任务的执行

export const taskRoute: FastifyPluginCallback<{deps: TopDeps}> = function (
  fastify,
  {deps: {taskManager}},
  done
) {
  fastify.get<{Reply: TasksRes}>('/tasks', async (req, res) => {
    res.send(await taskManager.listAvailableUserTasks());
  });

  fastify.get<{Reply: GroupedTasksRes}>('/grouped-tasks', async (req, res) => {
    res.send(await taskManager.getAllRegisterTaskGroupByPlugin());
  });

  done();
};
