import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

const MIME_TO_EXTENSION: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const EXTENSION_TO_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_TO_EXTENSION).map(([mime, ext]) => [ext, mime]),
);

@Injectable()
export class PractitionerCredentialStorageService {
  private readonly baseDir = path.resolve(process.cwd(), 'uploads');

  getAllowedMimeTypes(): string[] {
    return Object.keys(MIME_TO_EXTENSION);
  }

  isAllowedMimeType(mimeType?: string | null): boolean {
    if (!mimeType) return false;
    return mimeType in MIME_TO_EXTENSION;
  }

  async saveCredentialFile(input: {
    practitionerProfileId: string;
    mimeType: string;
    fileBuffer: Buffer;
  }): Promise<{ fileUrl: string; absolutePath: string; sizeBytes: number }> {
    const extension = MIME_TO_EXTENSION[input.mimeType];
    if (!extension) {
      throw new Error('Unsupported practitioner credential file type');
    }

    const safePractitionerId = this.sanitizeSegment(input.practitionerProfileId);
    const fileName = `${randomUUID().replace(/-/g, '')}${extension}`;
    const relativeDir = path.join(
      'practitioners',
      safePractitionerId,
      'credentials',
    );
    const absoluteDir = path.join(this.baseDir, relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });

    const absolutePath = path.join(absoluteDir, fileName);
    await fs.writeFile(absolutePath, input.fileBuffer);
    const stat = await fs.stat(absolutePath);

    return {
      fileUrl: `/uploads/${relativeDir.replace(/\\/g, '/')}/${fileName}`,
      absolutePath,
      sizeBytes: stat.size,
    };
  }

  /**
   * Resolves an absolute on-disk path for a stored fileUrl.
   * Only supports URLs created by this storage service under `/uploads/...`.
   * Returns null for unknown/unsafe URLs.
   */
  resolveAbsolutePathFromFileUrl(fileUrl: string): string | null {
    const normalized = String(fileUrl ?? '').trim();
    if (!normalized.startsWith('/uploads/')) return null;

    // Drop leading "/uploads/" and resolve under baseDir.
    const relative = normalized.slice('/uploads/'.length);
    if (!relative) return null;

    // Guard against path traversal by ensuring the resolved path stays under baseDir.
    const absolutePath = path.resolve(this.baseDir, relative);
    const base = this.baseDir.endsWith(path.sep)
      ? this.baseDir
      : this.baseDir + path.sep;
    if (!(absolutePath === this.baseDir || absolutePath.startsWith(base))) {
      return null;
    }

    return absolutePath;
  }

  guessMimeTypeFromAbsolutePath(absolutePath: string): string | null {
    const ext = path.extname(absolutePath).toLowerCase();
    return EXTENSION_TO_MIME[ext] ?? null;
  }

  private sanitizeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '');
  }
}
