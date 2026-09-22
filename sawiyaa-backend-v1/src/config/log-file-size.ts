export const DEFAULT_LOG_MAX_FILE_SIZE = '20mb';
export const LOG_MAX_FILE_SIZE_PATTERN = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i;

export function parseLogFileSize(
  value: string | undefined,
  defaultValue = 20 * 1024 * 1024,
): number {
  if (!value?.trim()) return defaultValue;
  const match = LOG_MAX_FILE_SIZE_PATTERN.exec(value.trim());
  if (!match) return defaultValue;
  const multiplier =
    { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }[
      match[2]?.toLowerCase() ?? 'b'
    ] ?? 1;
  const bytes = Number(match[1]) * multiplier;
  return Number.isFinite(bytes) && bytes > 0 ? Math.floor(bytes) : defaultValue;
}
