export type PaginationParams = {
  page?: number;
  limit?: number;
};

export function resolvePagination(
  params?: PaginationParams,
  defaults?: { page?: number; limit?: number; maxLimit?: number },
) {
  const defaultPage = defaults?.page ?? 1;
  const defaultLimit = defaults?.limit ?? 20;
  const maxLimit = defaults?.maxLimit ?? 100;

  const page = Number.isFinite(params?.page)
    ? Math.max(1, Math.trunc(params!.page!))
    : defaultPage;

  const limit = Number.isFinite(params?.limit)
    ? Math.min(maxLimit, Math.max(1, Math.trunc(params!.limit!)))
    : defaultLimit;

  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
