import {createFetch} from '@vueuse/core';
import type {ReconfigurationErrorRes} from 'feedengine';
import {router} from '@/routers/index';

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
        router.push('/configuration');
      }
      return ctx;
    },
  },
});
