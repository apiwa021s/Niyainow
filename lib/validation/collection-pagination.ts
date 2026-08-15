export const USER_COLLECTION_PAGE_SIZE = 24;

export type CollectionSearchParams = {
  page?: string | string[];
};

export type CollectionPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function parseCollectionPage(value: string | string[] | undefined) {
  if (typeof value !== "string") return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function collectionPagination(
  totalValue: number,
  requestedPageValue: number,
  pageSize = USER_COLLECTION_PAGE_SIZE,
): CollectionPagination {
  const total = Number.isSafeInteger(totalValue) && totalValue > 0 ? totalValue : 0;
  const safePageSize = Number.isSafeInteger(pageSize) && pageSize > 0
    ? pageSize
    : USER_COLLECTION_PAGE_SIZE;
  const requestedPage = Number.isSafeInteger(requestedPageValue) && requestedPageValue > 0
    ? requestedPageValue
    : 1;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  return {
    page: Math.min(requestedPage, totalPages),
    pageSize: safePageSize,
    total,
    totalPages,
  };
}

export function collectionPageHref(pathname: string, page: number) {
  return page > 1 ? `${pathname}?page=${page}` : pathname;
}
