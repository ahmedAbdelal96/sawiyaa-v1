import { mkdir, appendFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import TransportStream from 'winston-transport';
import { buildDailyLogFilePath, formatLocalDateFolder } from './logging-path.util';
import { toJsonLogRecord } from './logging-record.util';
import type { LogFileName, LogRecord, LogTarget } from './logging.types';

type DailyFileTransportOptions = TransportStream.TransportStreamOptions & {
  baseDir: string;
  fileName: LogFileName;
  target: LogTarget;
  retentionDays: number;
};

function normalizeTargets(value: unknown): LogTarget[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is LogTarget =>
      item === 'app' ||
      item === 'http' ||
      item === 'slow-requests' ||
      item === 'error' ||
      item === 'exceptions',
  );
}

export class DailyFileTransport extends TransportStream {
  private static lastCleanupByBaseDir = new Map<string, string>();

  constructor(private readonly options: DailyFileTransportOptions) {
    super(options);
  }

  override log(info: LogRecord, next: () => void): void {
    setImmediate(() => this.emit('logged', info));

    void this.persist(info).catch((error: unknown) => {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    });

    next();
  }

  private async persist(info: LogRecord): Promise<void> {
    if (info.fileEnabled === false) {
      return;
    }

    const targets = normalizeTargets(info.targets);
    if (targets.length > 0 && !targets.includes(this.options.target)) {
      return;
    }

    const baseDir = path.resolve(process.cwd(), this.options.baseDir);
    await this.cleanupIfNeeded(baseDir);

    const filePath = buildDailyLogFilePath(baseDir, this.options.fileName);
    await mkdir(path.dirname(filePath), { recursive: true });

    const record = toJsonLogRecord(info);
    await appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8');
  }

  private async cleanupIfNeeded(baseDir: string): Promise<void> {
    const retentionDays = Math.max(this.options.retentionDays, 0);
    if (retentionDays === 0) {
      return;
    }

    const currentFolder = formatLocalDateFolder();
    if (DailyFileTransport.lastCleanupByBaseDir.get(baseDir) === currentFolder) {
      return;
    }

    DailyFileTransport.lastCleanupByBaseDir.set(baseDir, currentFolder);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const cutoffKey = formatLocalDateFolder(cutoff);

    try {
      const entries = await readdir(baseDir, { withFileTypes: true });
      await Promise.all(
        entries
          .filter((entry) => entry.isDirectory())
          .filter((entry) => entry.name < cutoffKey)
          .map((entry) => rm(path.join(baseDir, entry.name), { recursive: true, force: true })),
      );
    } catch {
      // Best-effort cleanup only. Logging should never fail because retention cleanup did.
    }
  }
}
