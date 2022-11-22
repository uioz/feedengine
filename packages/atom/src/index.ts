export * from './types/index.js';
import type {AtomPluginMainTableModel} from './types/index.js';
import {definePlugin} from 'feedengine-plugin';
import {DataTypes} from 'sequelize';

export const plugin = definePlugin((context) => {
  const model = context.getMainModel<AtomPluginMainTableModel>({
    read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    plugin: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    task: {
      type: DataTypes.STRING,
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
  });

  context.registerFastifyPlugin(function (fastify, options, done) {
    // will be /api/atom/xxxx
    fastify.get('/atom/:provider', async () => {
      return 'hello world';
    });

    done();
  });

  return {
    async onCreate() {
      await model.sync();
    },
    async onDispose() {
      context.getSequelize().modelManager.removeModel(model);
    },
  };
});
