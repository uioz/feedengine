import type {TopDeps} from '../index.js';
import type {Closeable, ScheduleRes} from '../types/index.js';
import {type Job, scheduleJob} from 'node-schedule';
import {TaskWrap} from '../task/index.js';
import {PluginState} from '../plugins/index.js';

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
  pluginManager: TopDeps['pluginManager'];
  refs = new Map<
    number,
    {
      taskRef?: TaskWrap;
      taskId: number;
      job?: Job;
    }
  >();

  constructor({log, storageManager, taskManager, pluginManager}: TopDeps) {
    this.log = log.child({source: ScheduleManager.name});

    this.storageManager = storageManager;

    this.schedulesModel = storageManager.schedulesModel;

    this.taskManager = taskManager;

    this.pluginManager = pluginManager;
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
      include: {
        model: this.taskManager.tasksModel,
        required: true,
      },
    });

    return schedules
      .map(
        ({id, TaskId: taskId, type, lastRun, createdAt, trigger, Task: {plugin, task, name}}) => {
          return {
            id,
            taskId,
            type,
            lastRun,
            createdAt,
            trigger,
            state: this.refs.get(id)?.taskRef?.state,
            plugin,
            task,
            name,
          };
        }
      )
      .filter((item) => this.pluginManager.pluginStates.get(PluginState.actived)!.has(item.plugin));
  }

  async execManualTask(id: number) {
    const scheduleRef = this.refs.get(id);

    if (scheduleRef === undefined) {
      throw new Error('');
    }

    const result = await this.schedulesModel.findByPk(id);

    if (result === null) {
      throw new Error('');
    }

    if (result.type !== ScheduleType.manual) {
      throw new Error('');
    }

    scheduleRef.taskRef = this.taskManager.execTask(result.TaskId, this.taskSuccessCallback);
  }

  async close() {
    this.log.info('close');
  }
}
