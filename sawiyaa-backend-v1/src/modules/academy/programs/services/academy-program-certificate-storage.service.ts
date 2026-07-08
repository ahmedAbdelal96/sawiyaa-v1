import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

const CERTIFICATE_MIME_TYPE = 'application/pdf';

export type StoredAcademyProgramCertificate = {
  absolutePath: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
};

@Injectable()
export class AcademyProgramCertificateStorageService {
  private readonly baseDir = path.resolve(
    process.cwd(),
    'storage',
    'academy-program-certificates',
  );

  isAllowedMimeType(mimeType?: string | null): boolean {
    return mimeType?.trim().toLowerCase() === CERTIFICATE_MIME_TYPE;
  }

  async saveCertificate(input: {
    enrollmentId: string;
    fileBuffer: Buffer;
  }): Promise<StoredAcademyProgramCertificate> {
    const fileName = `${Date.now()}-${randomUUID().replace(/-/g, '')}.pdf`;
    const relativeDir = path.join(
      'academy-program-certificates',
      this.sanitizeSegment(input.enrollmentId),
    );
    const storagePath = path.join(relativeDir, fileName);
    const absolutePath = path.join(process.cwd(), 'storage', storagePath);

    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, input.fileBuffer);

    const stat = await fs.stat(absolutePath);
    return {
      absolutePath,
      storagePath,
      mimeType: CERTIFICATE_MIME_TYPE,
      fileSizeBytes: stat.size,
    };
  }

  async resolveCertificate(storagePath: string): Promise<StoredAcademyProgramCertificate | null> {
    const normalized = String(storagePath ?? '').trim();
    if (!normalized) {
      return null;
    }

    const absolutePath = path.resolve(process.cwd(), 'storage', normalized);
    const storageBase = path.resolve(process.cwd(), 'storage');
    const storageBasePrefix = storageBase.endsWith(path.sep)
      ? storageBase
      : `${storageBase}${path.sep}`;
    if (!(absolutePath === storageBase || absolutePath.startsWith(storageBasePrefix))) {
      return null;
    }

    const stat = await fs.stat(absolutePath).catch(() => null);
    if (!stat?.isFile()) {
      return null;
    }

    return {
      absolutePath,
      storagePath: normalized,
      mimeType: CERTIFICATE_MIME_TYPE,
      fileSizeBytes: stat.size,
    };
  }

  async deleteCertificate(storagePath: string): Promise<boolean> {
    const resolved = await this.resolveCertificate(storagePath);
    if (!resolved) {
      return false;
    }

    await fs.unlink(resolved.absolutePath).catch(() => undefined);
    return true;
  }

  private sanitizeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9-]/g, '');
  }
}
