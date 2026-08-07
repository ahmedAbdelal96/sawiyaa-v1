import { mkdir, appendFile, readdir, rm, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import TransportStream from 'winston-transport';
import {
  buildDailyLogFilePath,
  formatLocalDateFolder,
} from './logging-path.util';
import { toJsonLogRecord } from './logging-record.util';
import type { LogFileName, LogRecord, LogTarget } from './logging.types';

type DailyFileTransportOptions = TransportStream.TransportStreamOptions & {
  baseDir: string;
  fileName: LogFileName;
  target: LogTarget;
  retentionDays: number;
  maxFileSizeBytes: number;
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
  private static writes = new Map<string, Promise<void>>();

  constructor(private readonly options: DailyFileTransportOptions) {
    super(options);
  }

  override log(info: LogRecord, next: () => void): void {
    setImmediate(() => this.emit('logged', info));

    const fileKey = path.resolve(
      process.cwd(),
      this.options.baseDir,
      this.options.fileName,
    );
    const previous =
      DailyFileTransport.writes.get(fileKey) ?? Promise.resolve();
    const current = previous
      .then(() => this.persist(info))
      .catch((error: unknown) => {
        this.emit(
          'error',
          error instanceof Error ? error : new Error(String(error)),
        );
      });
    DailyFileTransport.writes.set(fileKey, current);
    void current.finally(() => {
      if (DailyFileTransport.writes.get(fileKey) === current) {
        DailyFileTransport.writes.delete(fileKey);
      }
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

    const recordDate = info.timestamp ? new Date(info.timestamp) : new Date();
    const filePath = buildDailyLogFilePath(
      baseDir,
      this.options.fileName,
      recordDate,
    );
    await mkdir(path.dirname(filePath), { recursive: true });
    await this.rotateIfNeeded(filePath);

    const record = toJsonLogRecord(info);
    await appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8');
  }

  private async cleanupIfNeeded(baseDir: string): Promise<void> {
    const retentionDays = Math.max(this.options.retentionDays, 0);
    if (retentionDays === 0) {
      return;
    }

    const currentFolder = formatLocalDateFolder();
    if (
      DailyFileTransport.lastCleanupByBaseDir.get(baseDir) === currentFolder
    ) {
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
          .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
          .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
          .filter((entry) => entry.name < cutoffKey)
          .map((entry) =>
            rm(path.join(baseDir, entry.name), {
              recursive: true,
              force: true,
            }),
          ),
      );
    } catch (error) {
      this.emit(
        'warning',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private async rotateIfNeeded(filePath: string): Promise<void> {
    const limit = this.options.maxFileSizeBytes;
    if (!limit) return;
    let fileSize = 0;
    try {
      fileSize = (await stat(filePath)).size;
    } catch {
      return;
    }
    if (fileSize < limit) return;

    for (let index = 5; index >= 1; index -= 1) {
      const source =
        index === 1
          ? filePath
          : `${filePath.replace(/\.log$/, '')}.${index - 1}.log`;
      const destination = `${filePath.replace(/\.log$/, '')}.${index}.log`;
      try {
        // Windows refuses rename-over-existing-file. Removing the destination
        // is safe here because all writes for this file are serialized above.
        await rm(destination, { force: true });
        await rename(source, destination);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
  }
}
