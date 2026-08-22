import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '@common/prisma/prisma.service';
import { StoredFilePurpose } from '@prisma/client';
import { UnifiedFileStorageService } from '@modules/files/unified-file-storage.service';

export type StoredPractitionerAvatar = { absolutePath: string; mimeType: string; updatedAtMs: number };
type AvatarMetadata = { avatarUrl: string; updatedAtMs: number };
const MIME_TO_EXTENSION: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

@Injectable()
export class PractitionerAvatarStorageService {
  constructor(private readonly prisma: PrismaService, private readonly files: UnifiedFileStorageService) {}

  getAllowedMimeTypes(): string[] { return Object.keys(MIME_TO_EXTENSION); }
  isAllowedMimeType(mimeType?: string | null): boolean { return !!mimeType && mimeType in MIME_TO_EXTENSION; }

  async saveAvatar(params: { practitionerProfileId: string; fileBuffer: Buffer; mimeType: string }): Promise<AvatarMetadata> {
    const stored = await this.files.store({ purpose: StoredFilePurpose.PRACTITIONER_AVATAR, fileBuffer: params.fileBuffer, mimeType: params.mimeType, maxBytes: 5 * 1024 * 1024, allowedMimeTypes: this.getAllowedMimeTypes() });
    const previous = await this.prisma.practitionerProfile.findUnique({ where: { id: params.practitionerProfileId }, select: { avatarFileId: true } });
    try { await this.prisma.practitionerProfile.update({ where: { id: params.practitionerProfileId }, data: { avatarFileId: stored.id } }); }
    catch (error) { await this.files.delete(stored.id).catch(() => undefined); throw error; }
    if (previous?.avatarFileId && previous.avatarFileId !== stored.id) await this.files.delete(previous.avatarFileId).catch(() => undefined);
    return { avatarUrl: this.toApiAvatarUrl(stored.updatedAt.getTime()), updatedAtMs: stored.updatedAt.getTime() };
  }

  async resolveAvatarMetadata(practitionerProfileId: string): Promise<AvatarMetadata | null> {
    const stored = await this.findStoredAvatar(practitionerProfileId);
    return stored ? { avatarUrl: this.toApiAvatarUrl(stored.updatedAtMs), updatedAtMs: stored.updatedAtMs } : null;
  }

  async getAvatarFile(practitionerProfileId: string): Promise<StoredPractitionerAvatar | null> { return this.findStoredAvatar(practitionerProfileId); }

  async deleteAvatar(practitionerProfileId: string): Promise<boolean> {
    const profile = await this.prisma.practitionerProfile.findFirst({ where: { OR: [{ id: practitionerProfileId }, { userId: practitionerProfileId }] }, select: { id: true, avatarFileId: true } });
    const current = profile;
    if (!current?.avatarFileId) return false;
    const removed = await this.files.delete(current.avatarFileId);
    await this.prisma.practitionerProfile.update({ where: { id: current.id }, data: { avatarFileId: null } });
    return removed;
  }

  private async findStoredAvatar(practitionerProfileId: string): Promise<StoredPractitionerAvatar | null> {
    const current = await this.prisma.practitionerProfile.findUnique({ where: { id: practitionerProfileId }, select: { avatarFileId: true } });
    if (!current?.avatarFileId) return null;
    const stored = await this.files.resolve(current.avatarFileId);
    return stored ? { absolutePath: stored.absolutePath, mimeType: stored.mimeType, updatedAtMs: stored.updatedAt.getTime() } : null;
  }

  private toApiAvatarUrl(updatedAtMs: number): string { return `/api/v1/practitioners/me/avatar?v=${Math.floor(updatedAtMs)}`; }
  toPublicAvatarUrl(publicSlug: string, updatedAtMs: number): string { return `/api/v1/public/practitioners/${encodeURIComponent(publicSlug)}/avatar?v=${Math.floor(updatedAtMs)}`; }
}
