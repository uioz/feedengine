export * from './types/index.js';
import {definePlugin} from 'feedengine-plugin';
import {AtomFeed, AtomStdFilter, AtomTask} from './types/index.js';
import {
  querystringSchema,
  isValidatedAtomFeed,
  buildAtomFeed,
  transQueryToStdFilter,
} from './utils.js';

export const plugin = definePlugin<true>((context, deps) => {
  const nonStdTaskTree = deps.taskManager.nonStdTaskTree;

  const atomTasks = nonStdTaskTree.get('atom');

  context.store.atom = {
    isValidatedAtomFeed,
    buildAtomFeed,
  };

  if (atomTasks === undefined || atomTasks.size === 0) {
    return {};
  }

  const prod = deps.prod;

  context.register.fastifyPlugin(function (fastify, options, done) {
    const driverManager = deps.driverManager;

    const sequelize = deps.storageManager.sequelize;

    for (const taskMeta of atomTasks.values()) {
      for (const task of taskMeta.taskConstructor as Array<AtomTask>) {
        const plugin = taskMeta.plugin;

        const generator = {
          content: `${taskMeta.plugin.name} - Power by ${deps.feedengine.name} ${deps.feedengine.version}`,
          version: taskMeta.plugin.version,
        };

        // will be /api/atom/xxxx
        fastify.get(
          `/atom/${taskMeta.plugin.name}${task.route}.atom`,
          {
            schema: {
              querystring: querystringSchema,
            },
            preHandler: (req, res, done) => {
              transQueryToStdFilter(req.query as AtomStdFilter);
              done();
            },
          },
          async (req, res) => {
            if (plugin.state !== 3) {
              return res.code(500).send(`plugin not activated`);
            }

            let pageRef: any;

            try {
              const atomFeed: string | AtomFeed = await task.handler(
                {
                  inject: (key) => plugin.provideStore.get(key),
                  pluginName: plugin.name,
                  pluginVerison: plugin.version,
                  pluginSettings: plugin.context.settings,
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
                req.query as AtomStdFilter
              );

              if (typeof atomFeed === 'string') {
                return res.type('application/atom+xml; charset=utf-8').send(atomFeed);
              }

              if (!prod) {
                isValidatedAtomFeed(atomFeed);
              }

              if (!atomFeed.generator) {
                atomFeed.generator = generator;
              }

              return res.type('application/atom+xml; charset=utf-8').send(buildAtomFeed(atomFeed));
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
