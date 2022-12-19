import {useRequest} from '@/utils/request';
import type {Schedule} from 'feedengine';
import {useScheduleStore} from '@/stores/schedule';

export function useSchedule(schedule: Schedule) {
  return {
    async exec() {
      await useRequest(`/schedule/${schedule.id}/exec`);
    },
    async handleDelete() {
      await useRequest(`/schedule/${schedule.id}`).delete();

      useScheduleStore().remove(schedule.id, schedule.type);
    },
  };
}
