import { Injectable } from '@nestjs/common';
import { createReadStream, promises as fs } from 'fs';
import * as path from 'path';
import { StoredFilePurpose } from '@prisma/client';
import { UnifiedFileStorageService } from '@modules/files/unified-file-storage.service';

const MIME_TO_EXTENSION: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
export type StoredArticleCover = { absolutePath: string; mimeType: string; fileName: string };

@Injectable()
export class ArticleCoverStorageService {
  private readonly legacyDir = path.resolve(process.cwd(), 'storage', 'articles');
  constructor(private readonly files: UnifiedFileStorageService) {}
  getAllowedMimeTypes(): string[] { return Object.keys(MIME_TO_EXTENSION); }
  isAllowedMimeType(mimeType?: string | null): boolean { return !!mimeType && mimeType in MIME_TO_EXTENSION; }

  async saveCover(fileBuffer: Buffer, mimeType: string): Promise<string> {
    const stored = await this.files.store({ purpose: StoredFilePurpose.ARTICLE_COVER, fileBuffer, mimeType, maxBytes: 10 * 1024 * 1024, allowedMimeTypes: this.getAllowedMimeTypes() });
    return `/api/v1/article-covers/${stored.id}${stored.extension}`;
  }

  async getCoverFile(fileName: string): Promise<StoredArticleCover | null> {
    const candidate = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '');
    const id = candidate.slice(0, candidate.lastIndexOf('.'));
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      const stored = await this.files.resolve(id);
      if (stored?.purpose === StoredFilePurpose.ARTICLE_COVER) return { absolutePath: stored.absolutePath, mimeType: stored.mimeType, fileName: candidate };
    }
    const ext = path.extname(candidate).toLowerCase();
    const mimeType = Object.entries(MIME_TO_EXTENSION).find(([, value]) => value === ext)?.[0];
    if (!mimeType) return null;
    const absolutePath = path.join(this.legacyDir, candidate);
    const stat = await fs.stat(absolutePath).catch(() => null);
    return stat?.isFile() ? { absolutePath, mimeType, fileName: candidate } : null;
  }

  createFileStream(absolutePath: string) { return createReadStream(absolutePath); }
}
