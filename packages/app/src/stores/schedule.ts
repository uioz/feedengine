import {defineStore} from 'pinia';
import type {ScheduleRes} from 'feedengine';
import {useRequest} from '@/utils/request';

export enum ScheduleType {
  core,
  startup,
  interval,
  manual,
}

export enum TaskState {
  pending,
  running,
  finished,
  error,
}

interface ScheduleStoreState {
  core: ScheduleRes;
  startup: ScheduleRes;
  interval: ScheduleRes;
  manual: ScheduleRes;
}

export const useScheduleStore = defineStore('schedule', {
  state: (): ScheduleStoreState => ({
    core: [],
    startup: [],
    interval: [],
    manual: [],
  }),
  actions: {
    reset() {
      this.core = [];
      this.startup = [];
      this.interval = [];
      this.manual = [];
    },
    async fetch() {
      const {statusCode, data} = await useRequest('/schedules').json<ScheduleRes>();

      if (statusCode.value === 200 && data.value) {
        this.reset();
        for (const schedule of data.value) {
          (this as any)[ScheduleType[schedule.type]].push(schedule);
        }
      }
    },
  },
});
