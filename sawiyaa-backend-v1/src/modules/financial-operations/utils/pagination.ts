export function buildPagination(input: {
  page: number;
  limit: number;
  totalItems: number;
}) {
  const totalPages = Math.max(1, Math.ceil(input.totalItems / input.limit));

  return {
    page: input.page,
    limit: input.limit,
    totalItems: input.totalItems,
    totalPages,
  };
}
