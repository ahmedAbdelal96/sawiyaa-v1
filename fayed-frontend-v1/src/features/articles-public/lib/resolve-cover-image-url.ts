export function resolveCoverImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/api/v1/article-covers/")) {
    return url.replace("/api/v1/article-covers/", "/article-covers/");
  }
  return url;
}
