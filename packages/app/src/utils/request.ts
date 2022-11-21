import {createFetch} from '@vueuse/core';

export const useRequest = createFetch({
  baseUrl: '/api',
});
