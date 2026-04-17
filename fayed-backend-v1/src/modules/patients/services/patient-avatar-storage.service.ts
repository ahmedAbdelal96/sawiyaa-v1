import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

export type StoredPatientAvatar = {
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
export class PatientAvatarStorageService {
  private readonly baseDir = path.resolve(process.cwd(), 'storage', 'patients');

  // Backward-compatibility for files saved in the first implementation shape.
  private readonly legacyBaseDir = path.resolve(
    process.cwd(),
    'storage',
    'patients',
    'avatars',
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

  async saveAvatar(params: {
    patientProfileId: string;
    fileBuffer: Buffer;
    mimeType: string;
  }): Promise<AvatarMetadata> {
    const extension = MIME_TO_EXTENSION[params.mimeType];
    if (!extension) {
      throw new Error('Unsupported avatar mime type');
    }

    const filePrefix = this.getFilePrefix(params.patientProfileId);
    await fs.mkdir(this.baseDir, { recursive: true });

    await this.removeFlatAvatarFiles(filePrefix);
    await this.removeLegacyAvatarFiles(params.patientProfileId);

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

  async resolveAvatarMetadata(
    patientProfileId: string,
  ): Promise<AvatarMetadata | null> {
    const stored = await this.findStoredAvatar(patientProfileId);
    if (!stored) {
      return null;
    }

    return {
      avatarUrl: this.toApiAvatarUrl(stored.updatedAtMs),
      updatedAtMs: stored.updatedAtMs,
    };
  }

  async resolveAvatarDataUrl(
    patientProfileId: string,
  ): Promise<string | null> {
    const stored = await this.findStoredAvatar(patientProfileId);
    if (!stored) {
      return null;
    }

    const fileBuffer = await fs.readFile(stored.absolutePath);
    const base64 = fileBuffer.toString('base64');
    return `data:${stored.mimeType};base64,${base64}`;
  }

  async getAvatarFile(
    patientProfileId: string,
  ): Promise<StoredPatientAvatar | null> {
    return this.findStoredAvatar(patientProfileId);
  }

  async deleteAvatar(patientProfileId: string): Promise<boolean> {
    const filePrefix = this.getFilePrefix(patientProfileId);
    const removedFlat = await this.removeFlatAvatarFiles(filePrefix);
    const removedLegacy = await this.removeLegacyAvatarFiles(patientProfileId);
    return removedFlat || removedLegacy;
  }

  private getFilePrefix(patientProfileId: string): string {
    return patientProfileId.replace(/[^a-zA-Z0-9-]/g, '');
  }

  private getLegacyPatientDirectory(patientProfileId: string): string {
    return path.join(this.legacyBaseDir, this.getFilePrefix(patientProfileId));
  }

  private async removeLegacyAvatarFiles(
    patientProfileId: string,
  ): Promise<boolean> {
    const legacyDir = this.getLegacyPatientDirectory(patientProfileId);
    const files = await this.readDirectorySafe(legacyDir);
    if (files.length === 0) {
      return false;
    }

    let removed = false;
    await Promise.all(
      files.map(async (name) => {
        const absolutePath = path.join(legacyDir, name);
        const stat = await fs.stat(absolutePath).catch(() => null);
        if (!stat?.isFile()) {
          return;
        }

        await fs.unlink(absolutePath).catch(() => undefined);
        removed = true;
      }),
    );

    const remaining = await this.readDirectorySafe(legacyDir);
    if (remaining.length === 0) {
      await fs.rmdir(legacyDir).catch(() => undefined);
    }

    return removed;
  }

  private async removeFlatAvatarFiles(filePrefix: string): Promise<boolean> {
    const files = await this.readDirectorySafe(this.baseDir);
    if (files.length === 0) {
      return false;
    }

    let removed = false;
    await Promise.all(
      files.map(async (name) => {
        const extension = path.extname(name).toLowerCase();
        const basename = path.basename(name, extension);
        if (basename !== filePrefix) {
          return;
        }

        if (!this.extensionToMimeType(extension)) {
          return;
        }

        const absolutePath = path.join(this.baseDir, name);
        const stat = await fs.stat(absolutePath).catch(() => null);
        if (!stat?.isFile()) {
          return;
        }

        await fs.unlink(absolutePath).catch(() => undefined);
        removed = true;
      }),
    );

    return removed;
  }

  private async findStoredAvatar(
    patientProfileId: string,
  ): Promise<StoredPatientAvatar | null> {
    const filePrefix = this.getFilePrefix(patientProfileId);
    const files = await this.readDirectorySafe(this.baseDir);

    const flatCandidates = await Promise.all(
      files.map(async (name) => {
        const extension = path.extname(name).toLowerCase();
        const basename = path.basename(name, extension);
        if (basename !== filePrefix) {
          return null;
        }

        const mimeType = this.extensionToMimeType(extension);
        if (!mimeType) {
          return null;
        }

        const absolutePath = path.join(this.baseDir, name);
        const stat = await fs.stat(absolutePath).catch(() => null);
        if (!stat?.isFile()) {
          return null;
        }

        return {
          absolutePath,
          mimeType,
          updatedAtMs: stat.mtimeMs,
        } satisfies StoredPatientAvatar;
      }),
    );

    const existingFlat = flatCandidates
      .filter((item): item is StoredPatientAvatar => item !== null)
      .sort((a, b) => b.updatedAtMs - a.updatedAtMs);

    if (existingFlat[0]) {
      return existingFlat[0];
    }

    const legacyDir = this.getLegacyPatientDirectory(patientProfileId);
    const legacyFiles = await this.readDirectorySafe(legacyDir);
    if (legacyFiles.length === 0) {
      return null;
    }

    const legacyCandidates = await Promise.all(
      legacyFiles.map(async (name) => {
        const extension = path.extname(name).toLowerCase();
        const mimeType = this.extensionToMimeType(extension);
        if (!mimeType) {
          return null;
        }

        const absolutePath = path.join(legacyDir, name);
        const stat = await fs.stat(absolutePath).catch(() => null);
        if (!stat?.isFile()) {
          return null;
        }

        return {
          absolutePath,
          mimeType,
          updatedAtMs: stat.mtimeMs,
        } satisfies StoredPatientAvatar;
      }),
    );

    const existingLegacy = legacyCandidates
      .filter((item): item is StoredPatientAvatar => item !== null)
      .sort((a, b) => b.updatedAtMs - a.updatedAtMs);

    return existingLegacy[0] ?? null;
  }

  private extensionToMimeType(extension: string): string | null {
    const normalized = extension.toLowerCase();
    if (normalized === '.jpg' || normalized === '.jpeg') {
      return 'image/jpeg';
    }
    if (normalized === '.png') {
      return 'image/png';
    }
    if (normalized === '.webp') {
      return 'image/webp';
    }
    return null;
  }

  private async readDirectorySafe(target: string): Promise<string[]> {
    try {
      return await fs.readdir(target);
    } catch {
      return [];
    }
  }

  private toApiAvatarUrl(updatedAtMs: number): string {
    const version = Math.floor(updatedAtMs);
    return `/api/v1/patients/me/avatar?v=${version}`;
  }
}
