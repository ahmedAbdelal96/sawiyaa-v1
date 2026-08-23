import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '@common/prisma/prisma.service';
import { StoredFilePurpose } from '@prisma/client';
import { UnifiedFileStorageService } from '@modules/files/unified-file-storage.service';

export type StoredPatientAvatar = { absolutePath: string; mimeType: string; updatedAtMs: number };
type AvatarMetadata = { avatarUrl: string; updatedAtMs: number };
const MIME_TO_EXTENSION: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

@Injectable()
export class PatientAvatarStorageService {
  private readonly legacyDir = path.resolve(process.cwd(), 'storage', 'patients');
  private readonly legacyNestedDir = path.resolve(process.cwd(), 'storage', 'patients', 'avatars');

  constructor(private readonly prisma: PrismaService, private readonly files: UnifiedFileStorageService) {}

  getAllowedMimeTypes(): string[] { return Object.keys(MIME_TO_EXTENSION); }
  isAllowedMimeType(mimeType?: string | null): boolean { return !!mimeType && mimeType in MIME_TO_EXTENSION; }

  async saveAvatar(params: { patientProfileId: string; fileBuffer: Buffer; mimeType: string }): Promise<AvatarMetadata> {
    const stored = await this.files.store({ purpose: StoredFilePurpose.PATIENT_AVATAR, fileBuffer: params.fileBuffer, mimeType: params.mimeType, maxBytes: 5 * 1024 * 1024, allowedMimeTypes: this.getAllowedMimeTypes() });
    const previous = await this.prisma.patientProfile.findUnique({ where: { id: params.patientProfileId }, select: { avatarFileId: true } });
    try { await this.prisma.patientProfile.update({ where: { id: params.patientProfileId }, data: { avatarFileId: stored.id } }); }
    catch (error) { await this.files.delete(stored.id).catch(() => undefined); throw error; }
    if (previous?.avatarFileId && previous.avatarFileId !== stored.id) await this.files.delete(previous.avatarFileId).catch(() => undefined);
    return { avatarUrl: this.toApiAvatarUrl(stored.updatedAt.getTime()), updatedAtMs: stored.updatedAt.getTime() };
  }

  async resolveAvatarMetadata(patientProfileId: string): Promise<AvatarMetadata | null> {
    const stored = await this.findStoredAvatar(patientProfileId);
    return stored ? { avatarUrl: this.toApiAvatarUrl(stored.updatedAtMs), updatedAtMs: stored.updatedAtMs } : null;
  }

  async resolveAvatarDataUrl(patientProfileId: string): Promise<string | null> {
    const stored = await this.findStoredAvatar(patientProfileId);
    return stored ? `data:${stored.mimeType};base64,${(await fs.readFile(stored.absolutePath)).toString('base64')}` : null;
  }

  async getAvatarFile(patientProfileId: string): Promise<StoredPatientAvatar | null> { return this.findStoredAvatar(patientProfileId); }

  async deleteAvatar(patientProfileId: string): Promise<boolean> {
    const current = await this.prisma.patientProfile.findUnique({ where: { id: patientProfileId }, select: { avatarFileId: true } });
    let removed = false;
    if (current?.avatarFileId) { removed = await this.files.delete(current.avatarFileId); await this.prisma.patientProfile.update({ where: { id: patientProfileId }, data: { avatarFileId: null } }); }
    const safeId = patientProfileId.replace(/[^a-zA-Z0-9-]/g, '');
    for (const directory of [this.legacyDir, path.join(this.legacyNestedDir, safeId)]) {
      const entries = await fs.readdir(directory).catch(() => []);
      for (const name of entries) {
        const ext = path.extname(name).toLowerCase();
        if (directory === this.legacyDir && path.basename(name, ext) !== safeId) continue;
        if (!Object.values(MIME_TO_EXTENSION).includes(ext)) continue;
        await fs.unlink(path.join(directory, name)).then(() => { removed = true; }).catch(() => undefined);
      }
    }
    return removed;
  }

  private async findStoredAvatar(patientProfileId: string): Promise<StoredPatientAvatar | null> {
    const current = await this.prisma.patientProfile.findUnique({ where: { id: patientProfileId }, select: { avatarFileId: true } });
    if (current?.avatarFileId) {
      const stored = await this.files.resolve(current.avatarFileId);
      if (stored) return { absolutePath: stored.absolutePath, mimeType: stored.mimeType, updatedAtMs: stored.updatedAt.getTime() };
    }
    const safeId = patientProfileId.replace(/[^a-zA-Z0-9-]/g, '');
    const candidates: string[] = [];
    for (const directory of [this.legacyDir, path.join(this.legacyNestedDir, safeId)]) {
      for (const name of await fs.readdir(directory).catch(() => [])) {
        const ext = path.extname(name).toLowerCase();
        if ((directory !== this.legacyDir || path.basename(name, ext) === safeId) && Object.values(MIME_TO_EXTENSION).includes(ext)) candidates.push(path.join(directory, name));
      }
    }
    for (const absolutePath of candidates.sort()) {
      const stat = await fs.stat(absolutePath).catch(() => null);
      if (stat?.isFile()) return { absolutePath, mimeType: Object.entries(MIME_TO_EXTENSION).find(([, value]) => absolutePath.endsWith(value))?.[0] ?? 'image/jpeg', updatedAtMs: stat.mtimeMs };
    }
    return null;
  }

  private toApiAvatarUrl(updatedAtMs: number): string { return `/api/v1/patients/me/avatar?v=${Math.floor(updatedAtMs)}`; }
}
