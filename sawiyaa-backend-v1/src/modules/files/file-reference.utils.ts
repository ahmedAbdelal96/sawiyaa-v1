const UUID_RE =
  '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

export function extractStoredFileIdFromUrl(
  value: string | null | undefined,
  routeSegment: string,
): string | null {
  const match = value
    ?.trim()
    .match(new RegExp(`/${routeSegment}/(${UUID_RE})(?:\\.[a-z0-9]+)?$`, 'i'));
  return match?.[1] ?? null;
}
