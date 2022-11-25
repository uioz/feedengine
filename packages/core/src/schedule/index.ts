import type {TopDeps} from '../index.js';
import {Model, InferAttributes, InferCreationAttributes, ModelStatic, DataTypes} from 'sequelize';
import type {ScheduleTableDefinition, Closeable, Initable} from '../types/index.js';

interface ScheduleModel
  extends ScheduleTableDefinition,
    Model<InferAttributes<ScheduleModel>, InferCreationAttributes<ScheduleModel>> {}

export enum ScheduleType {
  startup,
  time,
  interval,
  manual,
}

export class ScheduleManager implements Closeable, Initable {
  log: TopDeps['log'];
  storageManager: TopDeps['storageManager'];
  scheduleModel: ModelStatic<ScheduleModel>;

  constructor({log, storageManager}: TopDeps) {
    this.log = log.child({source: ScheduleManager.name});

    this.storageManager = storageManager;

    this.scheduleModel = storageManager.sequelize.define<ScheduleModel>('schedule', {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      type: {
        type: DataTypes.TINYINT,
        allowNull: false,
      },
      taskId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      lastRun: {
        type: DataTypes.DATEONLY,
      },
    });
  }

  async init() {
    await this.scheduleModel.sync();
    this.log.info('init');
  }

  active() {
    this.log.info('active');
  }

  async close() {
    this.log.info('close');
  }
}
