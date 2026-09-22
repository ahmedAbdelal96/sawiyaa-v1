import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { StoredFilePurpose } from '@prisma/client';
import { UnifiedFileStorageService } from '@modules/files/unified-file-storage.service';

const CERTIFICATE_MIME_TYPE = 'application/pdf';
export type StoredAcademyProgramCertificate = { absolutePath: string; storagePath: string; storedFileId: string; mimeType: string; fileSizeBytes: number };

@Injectable()
export class AcademyProgramCertificateStorageService {
  private readonly legacyRoot = path.resolve(process.cwd(), 'storage');
  constructor(private readonly files: UnifiedFileStorageService) {}
  isAllowedMimeType(mimeType?: string | null): boolean { return mimeType?.trim().toLowerCase() === CERTIFICATE_MIME_TYPE; }

  async saveCertificate(input: { enrollmentId: string; fileBuffer: Buffer; originalFileName?: string | null }): Promise<StoredAcademyProgramCertificate> {
    const stored = await this.files.store({ purpose: StoredFilePurpose.ACADEMY_CERTIFICATE, fileBuffer: input.fileBuffer, mimeType: CERTIFICATE_MIME_TYPE, originalFileName: input.originalFileName ?? 'certificate.pdf', maxBytes: 10 * 1024 * 1024, allowedMimeTypes: [CERTIFICATE_MIME_TYPE] });
    return { absolutePath: stored.absolutePath, storagePath: `file:${stored.id}`, storedFileId: stored.id, mimeType: stored.mimeType, fileSizeBytes: stored.sizeBytes };
  }

  async resolveCertificate(storagePath: string): Promise<StoredAcademyProgramCertificate | null> {
    const id = String(storagePath ?? '').replace(/^file:/, '').trim();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      const stored = await this.files.resolve(id);
      if (stored?.purpose === StoredFilePurpose.ACADEMY_CERTIFICATE) return { absolutePath: stored.absolutePath, storagePath, storedFileId: stored.id, mimeType: stored.mimeType, fileSizeBytes: stored.sizeBytes };
    }
    const normalized = String(storagePath ?? '').trim();
    if (!normalized || normalized.includes('..') || path.isAbsolute(normalized)) return null;
    const absolutePath = path.resolve(this.legacyRoot, normalized);
    const rootPrefix = this.legacyRoot.endsWith(path.sep) ? this.legacyRoot : `${this.legacyRoot}${path.sep}`;
    if (!absolutePath.startsWith(rootPrefix)) return null;
    const stat = await fs.stat(absolutePath).catch(() => null);
    return stat?.isFile() ? { absolutePath, storagePath: normalized, storedFileId: '', mimeType: CERTIFICATE_MIME_TYPE, fileSizeBytes: stat.size } : null;
  }

  async deleteCertificate(storagePath: string): Promise<boolean> {
    const id = String(storagePath ?? '').replace(/^file:/, '').trim();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return this.files.delete(id);
    const resolved = await this.resolveCertificate(storagePath);
    if (!resolved) return false;
    await fs.unlink(resolved.absolutePath).catch(() => undefined);
    return true;
  }
}
