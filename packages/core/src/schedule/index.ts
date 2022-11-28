import type {TopDeps} from '../index.js';
import type {Closeable} from '../types/index.js';
import {type Job, scheduleJob} from 'node-schedule';
import type {Task} from '../task/index.js';

export enum ScheduleType {
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
      taskRef: Task;
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

  private activeTask(
    lastRun: Date | null,
    id: number,
    trigger: string | null,
    type: number,
    taskId: number
  ) {
    const matchsDay = /^d(\d+)/;
    switch (type) {
      case ScheduleType.startup:
        this.refs.set(id, {
          taskRef: this.taskManager.execTask(taskId),
          taskId,
        });
        break;
      case ScheduleType.interval: {
        const day = matchsDay.exec(trigger as string)?.[1];

        if (day === undefined) {
          throw new Error('');
        }

        if (lastRun === null) {
          const job = scheduleJob({rule: getCrontab(day)}, () => {
            this.refs.set(id, {
              taskRef: this.taskManager.execTask(taskId),
              taskId,
              job,
            });
          });
        } else {
          const job = scheduleJob({start: lastRun, rule: getCrontab(day)}, () => {
            this.refs.set(id, {
              taskRef: this.taskManager.execTask(taskId),
              taskId,
              job,
            });
          });

          if (lastRun.getDate() + parseInt(day) === new Date().getDate()) {
            this.refs.set(id, {
              taskRef: this.taskManager.execTask(taskId),
              taskId,
            });
          }
        }

        break;
      }
    }
  }

  async active() {
    const result = await this.schedulesModel.findAll();

    for (const {lastRun, id, trigger, type, taskId} of result) {
      this.activeTask(lastRun, id, trigger, type, taskId);
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

    if (ref) {
      switch (state.type) {
        case ScheduleType.startup:
        case ScheduleType.manual:
          ref.job?.cancel();

          this.taskManager.destroyTask(ref.taskId);

          this.refs.delete(id);
          break;
        case ScheduleType.interval:
          if (state.trigger === undefined) {
            throw new Error('');
          }

          ref.job?.reschedule(getCrontab(state.trigger));

          this.taskManager.destroyTask(ref.taskId);
          break;
      }
    }

    await this.schedulesModel.update(
      {
        type: state.type,
        trigger: state.trigger,
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
      trigger?: string;
    }
  ): Promise<number> {
    const {lastRun, trigger, id, type} = await this.schedulesModel.create({
      taskId,
      type: state.type,
      trigger: state.trigger,
    });

    this.activeTask(lastRun, id, trigger, type, taskId);

    return id;
  }

  async deleteSchedule(id: number) {
    const ref = this.refs.get(id);

    if (ref === undefined) {
      throw new Error('');
    }

    ref.job?.cancel();

    this.taskManager.destroyTask(ref.taskId);

    this.refs.delete(id);

    await this.schedulesModel.destroy({
      where: {
        id,
      },
    });
  }

  async listAllSchedules() {
    const schedules = await this.schedulesModel.findAll({
      where: {
        id: [...this.refs.keys()],
      },
    });

    schedules.map(({id, taskId, type, lastRun, createdAt, trigger}) => {
      return {
        id,
        taskId,
        type,
        lastRun,
        createdAt,
        trigger,
        state: this.refs.get(id)?.taskRef.state,
      };
    });
  }

  async close() {
    this.log.info('close');
  }
}
