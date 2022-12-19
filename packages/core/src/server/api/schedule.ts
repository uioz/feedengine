import type {FastifyPluginCallback} from 'fastify';
import {TopDeps, ScheduleRes, SchedulePutRes} from '../../index.js';
import {ScheduleType} from '../../schedule/index.js';

export const scheduleRoute: FastifyPluginCallback<{deps: TopDeps}> = function (
  fastify,
  {deps: {scheduleManager}},
  done
) {
  fastify.get<{
    Reply: ScheduleRes;
  }>('/schedules', async (req, res) => {
    res.send(await scheduleManager.listAllSchedules());
  });

  fastify.get<{
    Params: {
      id: string;
    };
  }>('/schedule/:id/exec', async (req) => {
    await scheduleManager.scheduleManualTask(parseInt(req.params.id));
  });

  fastify.delete<{
    Params: {
      id: string;
    };
  }>('/schedule/:id', async (req) => {
    await scheduleManager.deleteSchedule(parseInt(req.params.id));
  });

  fastify.put<{
    Body: {
      taskId: number;
      type: ScheduleType;
      trigger: string;
    };
    Reply: SchedulePutRes;
  }>('/schedule', async (req, res) => {
    const {taskId, trigger, type} = req.body;

    const scheduleId = await scheduleManager.createSchedule(taskId, {
      type,
      trigger,
    });

    res.send({
      scheduleId,
    });
  });

  done();
};
