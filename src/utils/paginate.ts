export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export function getPagination(params: PaginationParams) {
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.min(params.pageSize ?? 10, 100);

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return { page, pageSize, skip, take };
}
