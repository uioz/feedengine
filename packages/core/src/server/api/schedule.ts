import type {FastifyPluginCallback} from 'fastify';
import {TopDeps, ScheduleRes} from '../../index.js';

export const scheduleRoute: FastifyPluginCallback<{deps: TopDeps}> = function (
  fastify,
  {deps: {scheduleManager}},
  done
) {
  fastify.get<{Reply: ScheduleRes}>('/schedules', async (req, res) => {
    res.send(await scheduleManager.listAllSchedules());
  });

  fastify.get<{
    Params: {
      id: string;
    };
  }>('/schedule/:id/exec', async (req) => {
    await scheduleManager.execManualTask(parseInt(req.params.id));
  });

  done();
};
