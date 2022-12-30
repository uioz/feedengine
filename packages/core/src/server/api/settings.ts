import type {FastifyPluginCallback} from 'fastify';
import {TopDeps, AppSettings} from '../../index.js';

export const settingsRoute: FastifyPluginCallback<{deps: TopDeps}> = function (
  fastify,
  {deps: {settingManager}},
  done
) {
  fastify.get<{
    Reply: AppSettings;
  }>('/settings/feedengine', async (req, res) => {
    res.send(await settingManager.getGlobalSettings());
  });

  fastify.post<{
    Body: AppSettings;
  }>('/settings/feedengine', async (req, res) => {
    res.send(await settingManager.setGlobalSettings(req.body));
  });

  fastify.patch<{
    Params: {
      target: keyof AppSettings;
    };
  }>('/settings/feedengine/:target', async (req) => {
    await settingManager.updateGlobalSettings(req.params.target, req.body as any);
  });
  done();
};
