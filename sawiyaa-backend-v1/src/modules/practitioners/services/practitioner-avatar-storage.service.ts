import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export type StoredPractitionerAvatar = {
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
export class PractitionerAvatarStorageService {
  private readonly baseDir = path.resolve(process.cwd(), 'storage', 'practitioners');

  getAllowedMimeTypes(): string[] {
    return Object.keys(MIME_TO_EXTENSION);
  }

  isAllowedMimeType(mimeType?: string | null): boolean {
    if (!mimeType) return false;
    return mimeType in MIME_TO_EXTENSION;
  }

  async saveAvatar(params: {
    practitionerProfileId: string;
    fileBuffer: Buffer;
    mimeType: string;
  }): Promise<AvatarMetadata> {
    const extension = MIME_TO_EXTENSION[params.mimeType];
    if (!extension) {
      throw new Error('Unsupported avatar mime type');
    }

    const practitionerDir = this.getPractitionerAvatarDirectory(params.practitionerProfileId);
    await fs.mkdir(practitionerDir, { recursive: true });
    await this.removeAvatarFiles(practitionerDir);

    const fileName = `${randomUUID()}${extension}`;
    const absolutePath = path.join(practitionerDir, fileName);
    await fs.writeFile(absolutePath, params.fileBuffer);
    const stat = await fs.stat(absolutePath);

    return {
      avatarUrl: this.toApiAvatarUrl(stat.mtimeMs),
      updatedAtMs: stat.mtimeMs,
    };
  }

  async resolveAvatarMetadata(practitionerProfileId: string): Promise<AvatarMetadata | null> {
    const stored = await this.findStoredAvatar(practitionerProfileId);
    if (!stored) return null;

    return {
      avatarUrl: this.toApiAvatarUrl(stored.updatedAtMs),
      updatedAtMs: stored.updatedAtMs,
    };
  }

  async getAvatarFile(practitionerProfileId: string): Promise<StoredPractitionerAvatar | null> {
    return this.findStoredAvatar(practitionerProfileId);
  }

  async deleteAvatar(practitionerProfileId: string): Promise<boolean> {
    const practitionerDir = this.getPractitionerAvatarDirectory(practitionerProfileId);
    const files = await this.readDirectorySafe(practitionerDir);
    if (files.length === 0) return false;

    let removed = false;
    await Promise.all(
      files.map(async (name) => {
        const extension = path.extname(name).toLowerCase();
        const mimeType = this.extensionToMimeType(extension);
        if (!mimeType) return;

        const absolutePath = path.join(practitionerDir, name);
        const stat = await fs.stat(absolutePath).catch(() => null);
        if (!stat?.isFile()) return;

        await fs.unlink(absolutePath).catch(() => undefined);
        removed = true;
      }),
    );

    return removed;
  }

  private getPractitionerAvatarDirectory(practitionerProfileId: string): string {
    const safeId = practitionerProfileId.replace(/[^a-zA-Z0-9-]/g, '');
    return path.join(this.baseDir, safeId, 'avatar');
  }

  private extensionToMimeType(extension: string): string | null {
    const ext = extension.toLowerCase();
    for (const [mime, mimeExt] of Object.entries(MIME_TO_EXTENSION)) {
      if (mimeExt === ext) return mime;
    }
    return null;
  }

  private async removeAvatarFiles(practitionerDir: string): Promise<void> {
    const files = await this.readDirectorySafe(practitionerDir);
    await Promise.all(
      files.map(async (name) => {
        const absolutePath = path.join(practitionerDir, name);
        const stat = await fs.stat(absolutePath).catch(() => null);
        if (!stat?.isFile()) return;
        await fs.unlink(absolutePath).catch(() => undefined);
      }),
    );
  }

  private async findStoredAvatar(
    practitionerProfileId: string,
  ): Promise<StoredPractitionerAvatar | null> {
    const practitionerDir = this.getPractitionerAvatarDirectory(practitionerProfileId);
    const files = await this.readDirectorySafe(practitionerDir);
    if (files.length === 0) return null;

    const candidates = await Promise.all(
      files.map(async (name) => {
        const extension = path.extname(name).toLowerCase();
        const mimeType = this.extensionToMimeType(extension);
        if (!mimeType) return null;

        const absolutePath = path.join(practitionerDir, name);
        const stat = await fs.stat(absolutePath).catch(() => null);
        if (!stat?.isFile()) return null;

        return {
          absolutePath,
          mimeType,
          updatedAtMs: stat.mtimeMs,
        } satisfies StoredPractitionerAvatar;
      }),
    );

    const existing = candidates
      .filter((item): item is StoredPractitionerAvatar => item !== null)
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
    return `/api/v1/practitioners/me/avatar?v=${version}`;
  }
}
