export * from './types/index.js';
import {definePlugin} from 'feedengine-plugin';
import {AtomTask} from './types/index.js';
import {querystringSchema, isValidatedAtomFeed} from './utils.js';

export const plugin = definePlugin<true>((context, deps) => {
  const nonStdTaskTree = deps.taskManager.nonStdTaskTree;

  const tasks = nonStdTaskTree.get('atom');

  context.store.atom = {
    isValidatedAtomFeed,
  };

  if (tasks === undefined || tasks.size === 0) {
    return {};
  }

  context.register.fastifyPlugin(function (fastify, options, done) {
    const settingManager = deps.settingManager;

    const driverManager = deps.driverManager;

    const sequelize = deps.storageManager.sequelize;

    for (const taskMeta of tasks.values()) {
      for (const task of taskMeta.taskConstructor as Array<AtomTask>) {
        const plugin = taskMeta.plugin;

        // will be /api/atom/xxxx
        fastify.get(
          `/atom/${taskMeta.plugin}${task.route}`,
          {
            schema: {
              querystring: querystringSchema,
            },
          },
          async (req, res) => {
            if (plugin.state !== 3) {
              return res.code(500).send(`plugin not activated`);
            }

            let pageRef: any;

            try {
              const result = await task.handler(
                {
                  inject: (key) => plugin.provideStore.get(key),
                  pluginName: plugin.name,
                  pluginVerison: plugin.version,
                  pluginSettings: await settingManager.getPluginSettings(plugin.name),
                  requestPage: async () => {
                    if (pageRef !== undefined) {
                      throw new Error('');
                    }

                    pageRef = await driverManager.requestPage(true);

                    return pageRef;
                  },
                  sequelize: sequelize,
                  store: context.store,
                  tool: context.tool,
                },
                req.params,
                req.query as any
              );

              if (typeof result === 'string') {
                return res.send(result);
              }

              if (Array.isArray(result)) {
                // wrap
                return res.send(result);
              }

              if (isValidatedAtomFeed(result)) {
                return res.send(result);
              }

              return res.code(500).send('feed provided by plugin is invalid');
            } catch (error) {
              return res.code(500).send(error);
            } finally {
              if (pageRef) {
                await driverManager.releasePage(pageRef, true);
              }
            }
          }
        );
      }
    }

    done();
  });

  return {};
});
