import { Injectable, Optional } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '@common/prisma/prisma.service';
import { StoredFilePurpose } from '@prisma/client';
import { UnifiedFileStorageService } from '@modules/files/unified-file-storage.service';

const MIME_TO_EXTENSION: Record<string, string> = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const EXTENSION_TO_MIME: Record<string, string> = Object.fromEntries(Object.entries(MIME_TO_EXTENSION).map(([mime, ext]) => [ext, mime]));

@Injectable()
export class PractitionerCredentialStorageService {
  private readonly legacyBaseDir = path.resolve(process.cwd(), 'uploads');

  constructor(@Optional() private readonly prisma?: PrismaService, @Optional() private readonly files?: UnifiedFileStorageService) {}

  getAllowedMimeTypes(): string[] { return Object.keys(MIME_TO_EXTENSION); }
  isAllowedMimeType(mimeType?: string | null): boolean { return !!mimeType && mimeType in MIME_TO_EXTENSION; }

  async saveCredentialFile(input: { practitionerProfileId?: string; applicationId?: string; mimeType: string; fileBuffer: Buffer; originalFileName?: string | null }): Promise<{ fileUrl: string; absolutePath: string; sizeBytes: number; storedFileId?: string }> {
    if (!this.files) return this.saveLegacy(input);
    const stored = await this.files.store({ purpose: StoredFilePurpose.PRACTITIONER_CREDENTIAL, fileBuffer: input.fileBuffer, mimeType: input.mimeType, originalFileName: input.originalFileName, maxBytes: 5 * 1024 * 1024, allowedMimeTypes: this.getAllowedMimeTypes() });
    const ownerSegment = input.practitionerProfileId
      ? this.sanitizeSegment(input.practitionerProfileId)
      : `application-${this.sanitizeSegment(input.applicationId ?? 'unknown')}`;
    return { fileUrl: `/uploads/practitioners/${ownerSegment}/credentials/${stored.id}${stored.extension}`, absolutePath: stored.absolutePath, sizeBytes: stored.sizeBytes, storedFileId: stored.id };
  }

  async resolveStoredFile(storedFileId: string) { return this.files?.resolve(storedFileId) ?? null; }

  resolveAbsolutePathFromFileUrl(fileUrl: string): string | null {
    const normalized = String(fileUrl ?? '').trim();
    if (!normalized.startsWith('/uploads/')) return null;
    const relative = normalized.slice('/uploads/'.length);
    const absolutePath = path.resolve(this.legacyBaseDir, relative);
    const base = this.legacyBaseDir.endsWith(path.sep) ? this.legacyBaseDir : `${this.legacyBaseDir}${path.sep}`;
    return absolutePath !== this.legacyBaseDir && absolutePath.startsWith(base) ? absolutePath : null;
  }

  async statSafeFile(absolutePath: string): Promise<import('fs').Stats | null> {
    const unified = this.files ? await this.files.statSafeFile(absolutePath) : null;
    if (unified) return unified;
    const baseReal = await fs.realpath(this.legacyBaseDir).catch(() => null);
    const fileReal = await fs.realpath(absolutePath).catch(() => null);
    if (!baseReal || !fileReal) return null;
    const prefix = baseReal.endsWith(path.sep) ? baseReal : `${baseReal}${path.sep}`;
    if (!fileReal.startsWith(prefix)) return null;
    const stat = await fs.stat(fileReal).catch(() => null);
    return stat?.isFile() ? stat : null;
  }

  guessMimeTypeFromAbsolutePath(absolutePath: string): string | null { return EXTENSION_TO_MIME[path.extname(absolutePath).toLowerCase()] ?? null; }

  async deleteCredential(fileUrl: string): Promise<void> {
    const id = this.extractStoredFileId(fileUrl);
    if (id && this.files) { await this.files.delete(id); return; }
    const absolutePath = this.resolveAbsolutePathFromFileUrl(fileUrl);
    if (absolutePath) await fs.unlink(absolutePath).catch((error: { code?: string }) => { if (error?.code !== 'ENOENT') throw error; });
  }

  async resolveDirectCreateCredentialFile(credentialId: string, mimeType: string) {
    if (!this.files || !this.isStoredFileId(credentialId) || !this.isAllowedMimeType(mimeType)) return null;
    return this.files.resolve(credentialId);
  }

  resolveDirectCreateCredentialFileUrl(credentialId: string, mimeType: string): string | null {
    const extension = MIME_TO_EXTENSION[mimeType];
    if (!extension || !this.isStoredFileId(credentialId)) return null;
    return `/uploads/practitioners/admin-direct-create/credentials/${credentialId}${extension}`;
  }

  private extractStoredFileId(fileUrl: string): string | null {
    const name = path.basename(String(fileUrl ?? '').split('?')[0]);
    const id = name.slice(0, name.lastIndexOf('.'));
    return this.isStoredFileId(id) ? id : null;
  }

  private isStoredFileId(value: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
  private sanitizeSegment(value: string): string { return value.replace(/[^a-zA-Z0-9_-]/g, ''); }

  private async saveLegacy(input: { practitionerProfileId?: string; applicationId?: string; mimeType: string; fileBuffer: Buffer; originalFileName?: string | null }) {
    const extension = MIME_TO_EXTENSION[input.mimeType];
    if (!extension) throw new Error('Unsupported practitioner credential file type');
    const ownerSegment = input.practitionerProfileId
      ? this.sanitizeSegment(input.practitionerProfileId)
      : `application-${this.sanitizeSegment(input.applicationId ?? 'unknown')}`;
    const relativeDir = path.join('practitioners', ownerSegment, 'credentials');
    const absoluteDir = path.join(this.legacyBaseDir, relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });
    const fileName = `${Date.now()}${extension}`;
    const absolutePath = path.join(absoluteDir, fileName);
    await fs.writeFile(absolutePath, input.fileBuffer);
    return { fileUrl: `/uploads/${relativeDir.replace(/\\/g, '/')}/${fileName}`, absolutePath, sizeBytes: input.fileBuffer.length };
  }
}
