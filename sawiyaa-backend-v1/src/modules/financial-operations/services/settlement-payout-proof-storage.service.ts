import { Injectable } from '@nestjs/common';
import { StoredFilePurpose } from '@prisma/client';
import { UnifiedFileStorageService } from '@modules/files/unified-file-storage.service';

const MIME_TO_EXTENSION: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };

export type StoredSettlementPayoutProof = {
  absolutePath: string;
  storagePath: string;
  storedFileId: string;
  mimeType: string;
  fileSizeBytes: number;
  originalFileName: string | null;
};

@Injectable()
export class SettlementPayoutProofStorageService {
  constructor(private readonly files: UnifiedFileStorageService) {}
  getAllowedMimeTypes(): string[] { return Object.keys(MIME_TO_EXTENSION); }
  isAllowedMimeType(mimeType?: string | null): boolean { return !!mimeType && mimeType in MIME_TO_EXTENSION; }

  async saveProof(params: { practitionerId: string; payoutId: string; fileBuffer: Buffer; mimeType: string; originalFileName?: string | null }): Promise<StoredSettlementPayoutProof> {
    const stored = await this.files.store({ purpose: StoredFilePurpose.PAYOUT_PROOF, fileBuffer: params.fileBuffer, mimeType: params.mimeType, originalFileName: params.originalFileName, maxBytes: 10 * 1024 * 1024 });
    return { absolutePath: stored.absolutePath, storagePath: `file:${stored.id}`, storedFileId: stored.id, mimeType: stored.mimeType, fileSizeBytes: stored.sizeBytes, originalFileName: stored.originalFileName };
  }

  async deleteProof(storagePath: string): Promise<boolean> {
    const id = this.extractId(storagePath);
    return id ? this.files.delete(id) : false;
  }

  async resolveProof(storagePath: string) {
    const id = this.extractId(storagePath);
    const stored = id ? await this.files.resolve(id) : null;
    return stored && stored.purpose === StoredFilePurpose.PAYOUT_PROOF ? { absolutePath: stored.absolutePath, mimeType: stored.mimeType, fileSizeBytes: stored.sizeBytes } : null;
  }

  private extractId(storagePath: string): string | null {
    const id = String(storagePath ?? '').replace(/^file:/, '').trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null;
  }
}
