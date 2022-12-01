import type {TopDeps} from '../index.js';
import type {Closeable, ScheduleRes} from '../types/index.js';
import {type Job, scheduleJob} from 'node-schedule';
import type {TaskWrap} from '../task/index.js';

export enum ScheduleType {
  core,
  other,
  startup,
  interval,
  manual,
}

function getCrontab(day: string | number) {
  return `0 0 */${day} * *`;
}

export class ScheduleManager implements Closeable {
  log: TopDeps['log'];
  storageManager: TopDeps['storageManager'];
  schedulesModel: TopDeps['storageManager']['schedulesModel'];
  taskManager: TopDeps['taskManager'];
  refs = new Map<
    number,
    {
      taskRef?: TaskWrap;
      taskId: number;
      job?: Job;
    }
  >();

  constructor({log, storageManager, taskManager}: TopDeps) {
    this.log = log.child({source: ScheduleManager.name});

    this.storageManager = storageManager;

    this.schedulesModel = storageManager.schedulesModel;

    this.taskManager = taskManager;
  }

  private taskSuccessCallback = (taskId: number) => {
    this.updateLastRunTime(taskId, new Date());
  };

  private scheduleTask(
    lastRun: Date | null,
    id: number,
    trigger: string | null,
    type: number,
    taskId: number
  ) {
    const matchsDay = /^d(\d+)/;
    switch (type) {
      case ScheduleType.manual:
        this.refs.set(id, {
          taskId,
        });
        break;
      case ScheduleType.startup:
        this.refs.set(id, {
          taskRef: this.taskManager.execTask(taskId, this.taskSuccessCallback),
          taskId,
        });
        break;
      case ScheduleType.interval: {
        const day = matchsDay.exec(trigger as string)?.[1];

        if (day === undefined) {
          throw new Error('');
        }

        if (lastRun === null) {
          throw new Error('');
        }

        const job = scheduleJob({start: lastRun, rule: getCrontab(day)}, () => {
          this.refs.set(id, {
            taskRef: this.taskManager.execTask(taskId, this.taskSuccessCallback),
            taskId,
            job,
          });
        });

        if (lastRun.getDate() + parseInt(day) === new Date().getDate()) {
          this.refs.set(id, {
            taskRef: this.taskManager.execTask(taskId, this.taskSuccessCallback),
            taskId,
          });
        }

        break;
      }
    }
  }

  async active() {
    const result = await this.schedulesModel.findAll();

    for (const {lastRun, id, trigger, type, TaskId: taskId} of result) {
      this.scheduleTask(lastRun, id, trigger, type, taskId);
    }
  }

  async updateLastRunTime(id: number, date: Date) {
    await this.schedulesModel.update(
      {
        lastRun: date,
      },
      {
        where: {
          id,
        },
      }
    );
  }

  async changeSchedule(
    id: number,
    state: {
      type?: ScheduleType;
      trigger?: string;
    }
  ) {
    const ref = this.refs.get(id);

    if (!ref) {
      throw new Error('');
    }

    const data = await this.schedulesModel.findOne({
      where: {
        id,
      },
    });

    if (data === null) {
      throw new Error('');
    }

    this.cancelSchedule(id);

    this.refs.delete(id);

    Object.assign(data.dataValues, {
      type: state.type,
      trigger: state.trigger,
    });

    const {lastRun, trigger, type, TaskId} = data.dataValues;

    this.scheduleTask(lastRun, id, trigger, type, TaskId);

    await this.schedulesModel.update(
      {
        lastRun,
        trigger,
        type,
      },
      {
        where: {
          id,
        },
      }
    );
  }

  async createSchedule(
    taskId: number,
    state: {
      type: ScheduleType;
      /**
       * type.interval 类型的任务 trigger 是必须提供的
       */
      trigger?: string;
    }
  ): Promise<number> {
    const {lastRun, trigger, id, type} = await this.schedulesModel.create({
      TaskId: taskId,
      type: state.type,
      trigger: state.trigger,
      // 为新创建的定时任务设置创建时间为最后运行时间
      // 如果让其默认值为 null 在用户未到达定时任务执行前关闭后再次打开
      // 依然要从新计时可能导致永远无法执行定时任务
      lastRun: state.type === ScheduleType.interval ? new Date() : undefined,
    });

    this.scheduleTask(lastRun, id, trigger, type, taskId);

    return id;
  }

  async cancelSchedule(id: number) {
    const ref = this.refs.get(id);

    if (ref === undefined) {
      throw new Error('');
    }

    ref.job?.cancel();

    if (ref.taskRef) {
      ref.taskRef.destroy();
    }
  }

  async deleteSchedule(id: number) {
    this.cancelSchedule(id);

    this.refs.delete(id);

    await this.schedulesModel.destroy({
      where: {
        id,
      },
    });
  }

  async listAllSchedules(): Promise<ScheduleRes> {
    const schedules = await this.schedulesModel.findAll({
      where: {
        id: [...this.refs.keys()],
      },
      include: this.taskManager.tasksModel,
    });

    // TODO: 测试sequelize挂载 task 表的位置, 定义表类型, 下面扩展 tasks 的字段

    return schedules.map(({id, TaskId: taskId, type, lastRun, createdAt, trigger}) => {
      return {
        id,
        taskId,
        type,
        lastRun,
        createdAt,
        trigger,
        state: this.refs.get(id)?.taskRef?.state,
      };
    });
  }

  async close() {
    this.log.info('close');
  }
}
