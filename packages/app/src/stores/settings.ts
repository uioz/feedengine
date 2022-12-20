import {defineStore} from 'pinia';
import type {AppSettings} from 'feedengine';
import {useRequest} from '@/utils/request';

interface ScheduleStoreState {
  settings: AppSettings | null;
}

export const useSettingsStore = defineStore('settings', {
  state: (): ScheduleStoreState => ({
    settings: null,
  }),
  actions: {
    async fetch() {
      const {statusCode, data} = await useRequest('/settings/feedengine').json<AppSettings>();

      if (statusCode.value === 200 && data.value) {
        this.settings = data.value;
      }
    },
  },
});
