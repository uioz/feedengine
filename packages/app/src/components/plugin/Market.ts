import {useOffsetPagination} from '@vueuse/core';
import {ref, watch, type Ref} from 'vue';
import * as queryRegistry from 'query-registry';
import type {SearchResult} from 'query-registry';

export function usePagination(serachText: Ref<string>) {
  const data = ref<Array<SearchResult>>([]);
  const page = ref(1);
  const pageSize = ref(20);
  const total = ref(0);
  const loading = ref(false);

  async function fetchData({
    currentPage,
    currentPageSize,
  }: {
    currentPage: number;
    currentPageSize: number;
  }) {
    loading.value = true;
    try {
      const result = await queryRegistry.searchPackages({
        query: {
          from: currentPage - 1,
          size: currentPageSize,
          text: `keywords:rollup-plugin+${serachText.value}`,
        },
      });
      total.value = result.total;

      data.value = result.objects;

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } finally {
      loading.value = false;
    }
  }

  const {currentPage, pageCount} = useOffsetPagination({
    page,
    pageSize,
    total,
    onPageChange: fetchData,
  });

  watch(serachText, () => fetchData({currentPage: page.value, currentPageSize: pageSize.value}));

  return {
    currentPage,
    pageCount,
    data,
    loading,
    fetchData() {
      return fetchData({currentPage: page.value, currentPageSize: pageSize.value});
    },
  };
}
