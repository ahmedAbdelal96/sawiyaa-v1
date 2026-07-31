export function preservePathAndQuery(
  pathname: string,
  searchParams: Pick<URLSearchParams, "toString">,
): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}
