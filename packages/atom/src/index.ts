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
        defaultValue: false,
      },
      uid: {
        type: DataTypes.UUIDV4,
        defaultValue: DataTypes.UUIDV4,
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
      indexes: [
        {
          unique: true,
          fields: ['PluginId', 'uid'],
        },
      ],
    }
  );

  context.store.atomModel = atomModel;

  atomModel.belongsTo(deps.storageManager.pluginModel, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    foreignKey: {
      allowNull: false,
    },
  });

  deps.storageManager.pluginModel.hasOne(atomModel);

  context.register.fastifyPlugin(function (fastify, options, done) {
    // will be /api/atom/xxxx
    fastify.get('/atom/:provider', async () => {
      return 'hello world';
    });

    done();
  });

  return {
    async onDispose() {
      context.sequelize.modelManager.removeModel(atomModel);
    },
  };
});
