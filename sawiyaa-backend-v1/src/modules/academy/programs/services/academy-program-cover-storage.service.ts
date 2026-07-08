import { Injectable } from '@nestjs/common';
import { createReadStream } from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export type StoredAcademyProgramCover = {
  absolutePath: string;
  mimeType: string;
  fileName: string;
};

@Injectable()
export class AcademyProgramCoverStorageService {
  private readonly baseDir = path.resolve(
    process.cwd(),
    'storage',
    'academy-program-covers',
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

  async saveCover(fileBuffer: Buffer, mimeType: string): Promise<string> {
    const extension = MIME_TO_EXTENSION[mimeType];
    if (!extension) {
      throw new Error('Unsupported academy program cover mime type');
    }

    await fs.mkdir(this.baseDir, { recursive: true });
    const fileName = `${Date.now()}-${randomUUID()}${extension}`;
    const absolutePath = path.join(this.baseDir, fileName);
    await fs.writeFile(absolutePath, fileBuffer);
    return this.toApiUrl(fileName);
  }

  async getCoverFile(fileName: string): Promise<StoredAcademyProgramCover | null> {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '');
    if (!safeName) {
      return null;
    }

    const extension = path.extname(safeName).toLowerCase();
    const mimeType = Object.entries(MIME_TO_EXTENSION).find(
      ([, ext]) => ext === extension,
    )?.[0];
    if (!mimeType) {
      return null;
    }

    const absolutePath = path.join(this.baseDir, safeName);
    const stat = await fs.stat(absolutePath).catch(() => null);
    if (!stat?.isFile()) {
      return null;
    }

    return {
      absolutePath,
      mimeType,
      fileName: safeName,
    };
  }

  createFileStream(absolutePath: string) {
    return createReadStream(absolutePath);
  }

  private toApiUrl(fileName: string): string {
    return `/api/v1/academy/program-covers/${fileName}`;
  }
}
