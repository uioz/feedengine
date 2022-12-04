export * from './types/index.js';
import {definePlugin} from 'feedengine-plugin';
import {DataTypes} from 'sequelize';
import {Atom} from './model.js';

export const plugin = definePlugin<true>((context, deps) => {
  const atomModel = Atom.init(
    {
      read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      uuid: {
        type: DataTypes.UUIDV4,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        primaryKey: true,
      },
      id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      author: DataTypes.JSON,
      category: DataTypes.JSON,
      contributor: DataTypes.JSON,
      summary: DataTypes.STRING,
      lang: DataTypes.STRING,
      content: DataTypes.JSON,
      updated: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      link: DataTypes.JSON,
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize: context.sequelize,
    }
  );

  context.store.atomModel = atomModel;

  atomModel.belongsTo(deps.storageManager.pluginModel);
  deps.storageManager.pluginModel.hasOne(atomModel);
  atomModel.belongsTo(deps.storageManager.tasksModel);
  deps.storageManager.tasksModel.hasOne(atomModel);

  context.registerFastifyPlugin(function (fastify, options, done) {
    // will be /api/atom/xxxx
    fastify.get('/atom/:provider', async () => {
      return 'hello world';
    });

    done();
  });

  return {
    async onCreate() {
      await atomModel.sync();
    },
    async onDispose() {
      context.sequelize.modelManager.removeModel(atomModel);
    },
  };
});
