import {defineStore} from 'pinia';
import type {ScheduleRes} from 'feedengine';
import {useRequest} from '@/utils/request';

export enum ScheduleType {
  core,
  other,
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
  other: ScheduleRes;
  startup: ScheduleRes;
  interval: ScheduleRes;
  manual: ScheduleRes;
}

export const useScheduleStore = defineStore('schedule', {
  state: (): ScheduleStoreState => ({
    core: [],
    other: [],
    startup: [],
    interval: [],
    manual: [],
  }),
  actions: {
    async fetch() {
      const {statusCode, data} = await useRequest('/schedules').json<ScheduleRes>();

      if (statusCode.value === 200 && data.value) {
        for (const schedule of data.value) {
          (this as any)[ScheduleType[schedule.type]].push(schedule);
        }
      }
    },
  },
});
