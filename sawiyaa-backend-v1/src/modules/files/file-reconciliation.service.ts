import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { StoredFilePurpose, StoredFileStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { UnifiedFileStorageService } from './unified-file-storage.service';

export type FileReconciliationReport = {
  activeRecords: number;
  missingFiles: string[];
  untrackedFiles: string[];
  expiredChatOrphans: string[];
  deletedChatOrphans: string[];
};

@Injectable()
export class FileReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: UnifiedFileStorageService,
  ) {}

  async reconcile(
    options: {
      olderThanHours?: number;
      deleteExpiredChatOrphans?: boolean;
    } = {},
  ): Promise<FileReconciliationReport> {
    const cutoff = new Date(
      Date.now() - (options.olderThanHours ?? 24) * 60 * 60 * 1000,
    );
    const records = await this.prisma.storedFile.findMany({
      where: { status: StoredFileStatus.ACTIVE },
      select: {
        id: true,
        storageKey: true,
        purpose: true,
        createdAt: true,
        messageAttachment: { select: { id: true } },
      },
    });
    const activeKeys = new Set(records.map((record) => record.storageKey));
    const missingFiles: string[] = [];
    for (const record of records) {
      const absolute = this.storage.resolveSafePath(record.storageKey);
      const stat = await fs.stat(absolute).catch(() => null);
      if (!stat?.isFile()) missingFiles.push(record.id);
    }

    const untrackedFiles: string[] = [];
    await this.collectUntracked(
      this.storage.rootDir,
      this.storage.rootDir,
      activeKeys,
      untrackedFiles,
    );

    const expiredChatOrphans = records
      .filter(
        (record) =>
          record.purpose === StoredFilePurpose.CHAT_ATTACHMENT &&
          !record.messageAttachment &&
          record.createdAt < cutoff,
      )
      .map((record) => record.id);
    const deletedChatOrphans: string[] = [];
    if (options.deleteExpiredChatOrphans) {
      for (const id of expiredChatOrphans) {
        if (await this.storage.delete(id)) deletedChatOrphans.push(id);
      }
    }

    return {
      activeRecords: records.length,
      missingFiles,
      untrackedFiles,
      expiredChatOrphans,
      deletedChatOrphans,
    };
  }

  private async collectUntracked(
    root: string,
    current: string,
    activeKeys: Set<string>,
    result: string[],
  ) {
    const entries = await fs
      .readdir(current, { withFileTypes: true })
      .catch(() => [] as import('fs').Dirent[]);
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await this.collectUntracked(root, absolute, activeKeys, result);
      } else if (entry.isFile()) {
        const storageKey = path
          .relative(root, absolute)
          .split(path.sep)
          .join('/');
        if (!activeKeys.has(storageKey)) result.push(storageKey);
      }
    }
  }
}
