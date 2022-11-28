import {Closeable, Initable} from '../types/index.js';
import type {TopDeps} from '../index.js';
import {resolve} from 'node:path';
import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  ModelStatic,
  Sequelize,
  CreationOptional,
  NonAttribute,
  ForeignKey,
  BelongsToSetAssociationMixin,
  BelongsToGetAssociationMixin,
  BelongsToCreateAssociationMixin,
  Association,
} from 'sequelize';

class PluginSettings extends Model<
  InferAttributes<PluginSettings>,
  InferCreationAttributes<PluginSettings>
> {
  declare name: string;
  declare version: string;
  declare settings: any;
}

class Tasks extends Model<InferAttributes<Tasks>, InferCreationAttributes<Tasks>> {
  declare id: CreationOptional<number>;
  declare version: string;
  declare plugin: string;
  declare task: string;
  declare name: string | null;
  declare settings: any | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare taskCount?: NonAttribute<number>;
}

class Schedules extends Model<InferAttributes<Schedules>, InferCreationAttributes<Schedules>> {
  declare id: CreationOptional<number>;
  declare taskId: ForeignKey<Tasks['id']>;
  declare type: number;
  declare trigger: string | null;
  declare lastRun: Date | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare getTask: BelongsToGetAssociationMixin<Tasks>;

  declare setTask: BelongsToSetAssociationMixin<Tasks, 'id'>;

  declare createTask: BelongsToCreateAssociationMixin<Tasks>;

  declare static associations: {
    Task: Association<Schedules, Tasks>;
  };
}

export class StorageManager implements Initable, Closeable {
  log: TopDeps['log'];
  rootDir: string;
  sequelize!: Sequelize;
  tasksModel: ModelStatic<Tasks>;
  schedulesModel: ModelStatic<Schedules>;
  settingsModel: ModelStatic<PluginSettings>;

  constructor({log, feedengine: {rootDir}}: TopDeps) {
    this.log = log.child({source: StorageManager.name});
    this.rootDir = rootDir;

    this.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: resolve(this.rootDir, 'db.sqlite'),
      logging: (sql) => this.log.info(sql),
      define: {
        freezeTableName: true,
      },
    });

    this.settingsModel = PluginSettings.init(
      {
        name: {
          type: DataTypes.TEXT,
          primaryKey: true,
          unique: true,
          allowNull: false,
        },
        version: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        settings: {
          type: DataTypes.JSON,
          allowNull: false,
        },
      },
      {
        sequelize: this.sequelize,
        timestamps: false,
      }
    );

    this.tasksModel = Tasks.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        version: {
          type: DataTypes.STRING,
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
        name: {
          type: DataTypes.STRING,
        },
        settings: {
          type: DataTypes.JSON,
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize: this.sequelize,
      }
    );

    this.schedulesModel = Schedules.init(
      {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        type: {
          type: DataTypes.TINYINT,
          allowNull: false,
        },
        trigger: {
          type: DataTypes.STRING,
        },
        lastRun: {
          type: DataTypes.DATE,
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      {
        sequelize: this.sequelize,
      }
    );

    this.tasksModel.hasMany(this.schedulesModel, {
      onDelete: 'CASCADE',
    });
    this.schedulesModel.belongsTo(this.tasksModel);
  }

  async init() {
    await this.sequelize.authenticate();
    await this.sequelize.sync();

    this.log.info(`init`);
  }

  async close() {
    await this.sequelize.close();

    this.log.info(`close`);
  }

  getWorkspace(pluginName: string, taskName?: string) {
    return resolve(this.rootDir, pluginName, taskName ?? '');
  }
}
