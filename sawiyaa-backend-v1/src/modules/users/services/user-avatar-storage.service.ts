import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

export type StoredUserAvatar = {
  absolutePath: string;
  mimeType: string;
  updatedAtMs: number;
};

type AvatarMetadata = {
  avatarUrl: string;
  updatedAtMs: number;
};

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class UserAvatarStorageService {
  private readonly baseDir = path.resolve(process.cwd(), 'storage', 'users');

  getAllowedMimeTypes(): string[] {
    return Object.keys(MIME_TO_EXTENSION);
  }

  isAllowedMimeType(mimeType?: string | null): boolean {
    if (!mimeType) return false;
    return mimeType in MIME_TO_EXTENSION;
  }

  async saveAvatar(params: {
    userId: string;
    fileBuffer: Buffer;
    mimeType: string;
  }): Promise<AvatarMetadata> {
    const extension = MIME_TO_EXTENSION[params.mimeType];
    if (!extension) {
      throw new Error('Unsupported avatar mime type');
    }

    const filePrefix = this.getFilePrefix(params.userId);
    await fs.mkdir(this.baseDir, { recursive: true });

    await this.removeAvatarFiles(filePrefix);

    const nextAbsolutePath = path.join(
      this.baseDir,
      `${filePrefix}${extension}`,
    );
    await fs.writeFile(nextAbsolutePath, params.fileBuffer);
    const stat = await fs.stat(nextAbsolutePath);

    return {
      avatarUrl: this.toApiAvatarUrl(stat.mtimeMs),
      updatedAtMs: stat.mtimeMs,
    };
  }

  async resolveAvatarMetadata(userId: string): Promise<AvatarMetadata | null> {
    const stored = await this.findStoredAvatar(userId);
    if (!stored) return null;

    return {
      avatarUrl: this.toApiAvatarUrl(stored.updatedAtMs),
      updatedAtMs: stored.updatedAtMs,
    };
  }

  async resolveAvatarDataUrl(userId: string): Promise<string | null> {
    const stored = await this.findStoredAvatar(userId);
    if (!stored) return null;

    const fileBuffer = await fs.readFile(stored.absolutePath);
    const base64 = fileBuffer.toString('base64');
    return `data:${stored.mimeType};base64,${base64}`;
  }

  async getAvatarFile(userId: string): Promise<StoredUserAvatar | null> {
    return this.findStoredAvatar(userId);
  }

  async deleteAvatar(userId: string): Promise<boolean> {
    const filePrefix = this.getFilePrefix(userId);
    return this.removeAvatarFiles(filePrefix);
  }

  private getFilePrefix(userId: string): string {
    return userId.replace(/[^a-zA-Z0-9-]/g, '');
  }

  private extensionToMimeType(extension: string): string | null {
    const ext = extension.toLowerCase();
    for (const [mime, mimeExt] of Object.entries(MIME_TO_EXTENSION)) {
      if (mimeExt === ext) return mime;
    }
    return null;
  }

  private async removeAvatarFiles(filePrefix: string): Promise<boolean> {
    const files = await this.readDirectorySafe(this.baseDir);
    if (files.length === 0) return false;

    let removed = false;
    await Promise.all(
      files.map(async (name) => {
        const extension = path.extname(name).toLowerCase();
        const basename = path.basename(name, extension);
        if (basename !== filePrefix) return;

        if (!this.extensionToMimeType(extension)) return;

        const absolutePath = path.join(this.baseDir, name);
        const stat = await fs.stat(absolutePath).catch(() => null);
        if (!stat?.isFile()) return;

        await fs.unlink(absolutePath).catch(() => undefined);
        removed = true;
      }),
    );

    return removed;
  }

  private async findStoredAvatar(
    userId: string,
  ): Promise<StoredUserAvatar | null> {
    const filePrefix = this.getFilePrefix(userId);
    const files = await this.readDirectorySafe(this.baseDir);
    if (files.length === 0) return null;

    const candidates = await Promise.all(
      files.map(async (name) => {
        const extension = path.extname(name).toLowerCase();
        const basename = path.basename(name, extension);
        if (basename !== filePrefix) return null;

        const mimeType = this.extensionToMimeType(extension);
        if (!mimeType) return null;

        const absolutePath = path.join(this.baseDir, name);
        const stat = await fs.stat(absolutePath).catch(() => null);
        if (!stat?.isFile()) return null;

        return {
          absolutePath,
          mimeType,
          updatedAtMs: stat.mtimeMs,
        } satisfies StoredUserAvatar;
      }),
    );

    const existing = candidates
      .filter((item): item is StoredUserAvatar => item !== null)
      .sort((a, b) => b.updatedAtMs - a.updatedAtMs);

    return existing[0] ?? null;
  }

  private async readDirectorySafe(dir: string): Promise<string[]> {
    try {
      return await fs.readdir(dir);
    } catch {
      return [];
    }
  }

  private toApiAvatarUrl(updatedAtMs: number): string {
    const version = Math.floor(updatedAtMs);
    return `/api/v1/users/me/avatar?v=${version}`;
  }
}
