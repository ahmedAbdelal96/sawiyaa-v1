import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream, promises as fs } from 'fs';
import { createHash, randomUUID } from 'crypto';
import * as path from 'path';
import { PrismaService } from '@common/prisma/prisma.service';
import { StoredFileStatus } from '@prisma/client';
import { FilePolicyService } from './file-policy.service';
import { FileValidationService } from './file-validation.service';
import {
  HARD_UPLOAD_CEILING_BYTES,
  PURPOSE_DIRECTORY,
  StoreFileInput,
  StoredFileWithPath,
} from './file.types';

@Injectable()
export class UnifiedFileStorageService {
  readonly rootDir = path.resolve(process.cwd(), 'storage', 'files');

  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: FileValidationService,
    private readonly policies: FilePolicyService,
  ) {}

  getHardUploadCeilingBytes(): number {
    return HARD_UPLOAD_CEILING_BYTES;
  }

  async store(input: StoreFileInput): Promise<StoredFileWithPath> {
    const policy = await this.policies.getPolicy(input.purpose, input.mimeType);
    if (!policy.enabled) throw new Error('FILE_UPLOADS_DISABLED');
    const allowedMimeTypes = input.allowedMimeTypes ?? policy.allowedMimeTypes;
    const maxBytes = Math.min(
      input.maxBytes ?? policy.maxBytes,
      policy.maxBytes,
      HARD_UPLOAD_CEILING_BYTES,
    );
    const validated = this.validation.validate({
      ...input,
      maxBytes,
      allowedMimeTypes,
    });
    const sha256 = createHash('sha256').update(input.fileBuffer).digest('hex');
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const storageKey = path.posix.join(
      PURPOSE_DIRECTORY[input.purpose],
      year,
      month,
      `${randomUUID()}${validated.extension}`,
    );
    const absolutePath = this.safeAbsolutePath(storageKey);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, input.fileBuffer, { flag: 'wx' });
    try {
      const created = await this.prisma.storedFile.create({
        data: {
          storageKey,
          originalFileName: validated.normalizedFileName,
          mimeType: input.mimeType.trim().toLowerCase(),
          extension: validated.extension,
          sizeBytes: input.fileBuffer.length,
          sha256,
          purpose: input.purpose,
          uploadedByUserId: input.uploadedByUserId ?? null,
          chatConversationId: input.chatConversationId ?? null,
          status: StoredFileStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
        },
      });
      return { ...created, absolutePath };
    } catch (error) {
      await fs.unlink(absolutePath).catch(() => undefined);
      throw error;
    }
  }

  async resolve(id: string): Promise<StoredFileWithPath | null> {
    const stored = await this.prisma.storedFile.findFirst({
      where: { id, status: StoredFileStatus.ACTIVE },
    });
    if (!stored) return null;
    const absolutePath = this.safeAbsolutePath(stored.storageKey);
    const stat = await fs.lstat(absolutePath).catch(() => null);
    if (!stat?.isFile()) return null;
    return { ...stored, absolutePath };
  }

  async resolveByStorageKey(
    storageKey: string,
  ): Promise<StoredFileWithPath | null> {
    const stored = await this.prisma.storedFile.findFirst({
      where: { storageKey, status: StoredFileStatus.ACTIVE },
    });
    if (!stored) return null;
    const absolutePath = this.safeAbsolutePath(stored.storageKey);
    const stat = await fs.lstat(absolutePath).catch(() => null);
    if (!stat?.isFile()) return null;
    return { ...stored, absolutePath };
  }

  async delete(id: string): Promise<boolean> {
    const stored = await this.prisma.storedFile.findUnique({ where: { id } });
    if (!stored || stored.status === StoredFileStatus.DELETED) return false;
    const absolutePath = this.safeAbsolutePath(stored.storageKey);
    const fileStat = await fs.lstat(absolutePath).catch(() => null);
    if (fileStat?.isSymbolicLink())
      throw new NotFoundException({ error: 'FILE_NOT_FOUND' });
    await fs.unlink(absolutePath).catch((error: { code?: string }) => {
      if (error?.code !== 'ENOENT') throw error;
    });
    await this.prisma.storedFile.update({
      where: { id },
      data: { status: StoredFileStatus.DELETED, deletedAt: new Date() },
    });
    return true;
  }

  openReadStream(file: StoredFileWithPath) {
    return createReadStream(file.absolutePath);
  }

  async statSafeFile(absolutePath: string) {
    const safe = this.isSafeAbsolutePath(absolutePath);
    if (!safe) return null;
    const stat = await fs.lstat(absolutePath).catch(() => null);
    return stat?.isFile() ? stat : null;
  }

  resolveSafePath(storageKey: string): string {
    return this.safeAbsolutePath(storageKey);
  }

  private safeAbsolutePath(storageKey: string): string {
    const normalized = storageKey.replace(/\\/g, '/');
    if (
      !normalized ||
      normalized.includes('\0') ||
      normalized.split('/').includes('..') ||
      path.posix.isAbsolute(normalized) ||
      /^[a-zA-Z]:/.test(normalized)
    ) {
      throw new NotFoundException({ error: 'FILE_NOT_FOUND' });
    }
    const absolute = path.resolve(this.rootDir, normalized);
    if (!this.isSafeAbsolutePath(absolute))
      throw new NotFoundException({ error: 'FILE_NOT_FOUND' });
    return absolute;
  }

  private isSafeAbsolutePath(absolutePath: string): boolean {
    const root = this.rootDir.endsWith(path.sep)
      ? this.rootDir
      : `${this.rootDir}${path.sep}`;
    return absolutePath === this.rootDir || absolutePath.startsWith(root);
  }
}
