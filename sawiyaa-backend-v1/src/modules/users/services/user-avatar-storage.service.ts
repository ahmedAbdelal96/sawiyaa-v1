import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '@common/prisma/prisma.service';
import { StoredFilePurpose } from '@prisma/client';
import { UnifiedFileStorageService } from '@modules/files/unified-file-storage.service';

export type StoredUserAvatar = { absolutePath: string; mimeType: string; updatedAtMs: number };
type AvatarMetadata = { avatarUrl: string; updatedAtMs: number };
const MIME_TO_EXTENSION: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

@Injectable()
export class UserAvatarStorageService {
  private readonly legacyDir = path.resolve(process.cwd(), 'storage', 'users');

  constructor(private readonly prisma: PrismaService, private readonly files: UnifiedFileStorageService) {}

  getAllowedMimeTypes(): string[] { return Object.keys(MIME_TO_EXTENSION); }
  isAllowedMimeType(mimeType?: string | null): boolean { return !!mimeType && mimeType in MIME_TO_EXTENSION; }

  async saveAvatar(params: { userId: string; fileBuffer: Buffer; mimeType: string }): Promise<AvatarMetadata> {
    const stored = await this.files.store({ purpose: StoredFilePurpose.USER_AVATAR, fileBuffer: params.fileBuffer, mimeType: params.mimeType, maxBytes: 512 * 1024, allowedMimeTypes: this.getAllowedMimeTypes(), uploadedByUserId: params.userId });
    const previous = await this.prisma.user.findUnique({ where: { id: params.userId }, select: { avatarFileId: true } });
    try {
      await this.prisma.user.update({ where: { id: params.userId }, data: { avatarFileId: stored.id } });
    } catch (error) {
      await this.files.delete(stored.id).catch(() => undefined);
      throw error;
    }
    if (previous?.avatarFileId && previous.avatarFileId !== stored.id) await this.files.delete(previous.avatarFileId).catch(() => undefined);
    return { avatarUrl: this.toApiAvatarUrl(stored.updatedAt.getTime()), updatedAtMs: stored.updatedAt.getTime() };
  }

  async resolveAvatarMetadata(userId: string): Promise<AvatarMetadata | null> {
    const stored = await this.findStoredAvatar(userId);
    return stored ? { avatarUrl: this.toApiAvatarUrl(stored.updatedAtMs), updatedAtMs: stored.updatedAtMs } : null;
  }

  async resolveAvatarDataUrl(userId: string): Promise<string | null> {
    const stored = await this.findStoredAvatar(userId);
    if (!stored) return null;
    return `data:${stored.mimeType};base64,${(await fs.readFile(stored.absolutePath)).toString('base64')}`;
  }

  async getAvatarFile(userId: string): Promise<StoredUserAvatar | null> { return this.findStoredAvatar(userId); }

  async deleteAvatar(userId: string): Promise<boolean> {
    const current = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatarFileId: true } });
    let removed = false;
    if (current?.avatarFileId) { removed = await this.files.delete(current.avatarFileId); await this.prisma.user.update({ where: { id: userId }, data: { avatarFileId: null } }); }
    return (await this.removeLegacyFiles(userId)) || removed;
  }

  private async findStoredAvatar(userId: string): Promise<StoredUserAvatar | null> {
    const current = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatarFileId: true } });
    if (current?.avatarFileId) {
      const stored = await this.files.resolve(current.avatarFileId);
      if (stored) return { absolutePath: stored.absolutePath, mimeType: stored.mimeType, updatedAtMs: stored.updatedAt.getTime() };
    }
    const safeId = userId.replace(/[^a-zA-Z0-9-]/g, '');
    const entries = await fs.readdir(this.legacyDir).catch(() => []);
    for (const name of entries) {
      const ext = path.extname(name).toLowerCase();
      if (path.basename(name, ext) !== safeId || !Object.values(MIME_TO_EXTENSION).includes(ext)) continue;
      const stat = await fs.stat(path.join(this.legacyDir, name)).catch(() => null);
      if (stat?.isFile()) return { absolutePath: path.join(this.legacyDir, name), mimeType: Object.entries(MIME_TO_EXTENSION).find(([, value]) => value === ext)?.[0] ?? 'image/jpeg', updatedAtMs: stat.mtimeMs };
    }
    return null;
  }

  private async removeLegacyFiles(userId: string): Promise<boolean> {
    const safeId = userId.replace(/[^a-zA-Z0-9-]/g, '');
    const entries = await fs.readdir(this.legacyDir).catch(() => []);
    let removed = false;
    for (const name of entries) {
      const ext = path.extname(name).toLowerCase();
      if (path.basename(name, ext) !== safeId || !Object.values(MIME_TO_EXTENSION).includes(ext)) continue;
      await fs.unlink(path.join(this.legacyDir, name)).then(() => { removed = true; }).catch(() => undefined);
    }
    return removed;
  }

  private toApiAvatarUrl(updatedAtMs: number): string { return `/api/v1/users/me/avatar?v=${Math.floor(updatedAtMs)}`; }
}
