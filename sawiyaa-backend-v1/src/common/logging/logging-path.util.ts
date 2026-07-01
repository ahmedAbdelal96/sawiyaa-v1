import path from 'node:path';

const DAY_PAD = 2;

function pad(value: number): string {
  return String(value).padStart(DAY_PAD, '0');
}

export function formatLocalDateFolder(date = new Date()): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

export function buildDailyLogFilePath(
  baseDir: string,
  fileName: string,
  date = new Date(),
): string {
  return path.join(baseDir, formatLocalDateFolder(date), fileName);
}

