import {createFetch} from './useFetch';
import type {ReconfigurationErrorRes} from 'feedengine';
import {router} from '@/routers/index';
import {useConfigurationStore} from '@/stores/configuration';

function isReconfigurationError(data: any): data is ReconfigurationErrorRes {
  if (data.code === 0) {
    return true;
  }

  return false;
}

export const useRequest = createFetch({
  baseUrl: '/api',
  options: {
    onFetchError(ctx) {
      if (isReconfigurationError(ctx.data)) {
        useConfigurationStore().setDefaultConfiguration(ctx.data.data);
        router.push('/configuration');
      }

      ctx.data = null;

      return ctx;
    },
  },
});
