import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

export type StoredSettlementPayoutProof = {
  absolutePath: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  originalFileName: string | null;
};

@Injectable()
export class SettlementPayoutProofStorageService {
  private readonly baseDir = path.resolve(
    process.cwd(),
    'storage',
    'settlement-payout-proofs',
  );

  getAllowedMimeTypes(): string[] {
    return Object.keys(MIME_TO_EXTENSION);
  }

  isAllowedMimeType(mimeType?: string | null): boolean {
    if (!mimeType) {
      return false;
    }
    return mimeType in MIME_TO_EXTENSION;
  }

  async saveProof(params: {
    practitionerId: string;
    payoutId: string;
    fileBuffer: Buffer;
    mimeType: string;
    originalFileName?: string | null;
  }): Promise<StoredSettlementPayoutProof> {
    const extension = MIME_TO_EXTENSION[params.mimeType];
    if (!extension) {
      throw new Error('Unsupported settlement payout proof mime type');
    }

    const safePractitionerId = this.sanitizeSegment(params.practitionerId);
    const safePayoutId = this.sanitizeSegment(params.payoutId);
    const relativeStoragePath = path.join(
      'settlement-payout-proofs',
      safePractitionerId,
      `${safePayoutId}${extension}`,
    );
    const absolutePath = path.join(
      process.cwd(),
      'storage',
      relativeStoragePath,
    );
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, params.fileBuffer);
    const stat = await fs.stat(absolutePath);

    return {
      absolutePath,
      storagePath: relativeStoragePath,
      mimeType: params.mimeType,
      fileSizeBytes: stat.size,
      originalFileName: params.originalFileName ?? null,
    };
  }

  async deleteProof(storagePath: string): Promise<boolean> {
    const absolutePath = path.resolve(process.cwd(), 'storage', storagePath);
    return fs
      .unlink(absolutePath)
      .then(() => true)
      .catch(() => false);
  }

  async resolveProof(storagePath: string): Promise<{
    absolutePath: string;
    mimeType: string;
    fileSizeBytes: number;
  } | null> {
    const absolutePath = path.resolve(process.cwd(), 'storage', storagePath);
    const stat = await fs.stat(absolutePath).catch(() => null);
    if (!stat?.isFile()) {
      return null;
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const mimeType = Object.entries(MIME_TO_EXTENSION).find(
      ([, value]) => value === ext,
    )?.[0];
    if (!mimeType) {
      return null;
    }

    return {
      absolutePath,
      mimeType,
      fileSizeBytes: stat.size,
    };
  }

  private sanitizeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9-]/g, '');
  }
}
