import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  // Basic "homework" docs. Keep bounded and expand only when needed.
  'text/plain': '.txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
};

export type StoredGeneralChatAttachment = {
  fileId: string;
  absolutePath: string;
  mimeType: string;
  fileSizeBytes: number;
  originalFileName: string | null;
};

@Injectable()
export class GeneralChatAttachmentStorageService {
  private readonly baseDir = path.resolve(
    process.cwd(),
    'storage',
    'chat-attachments',
  );

  getAllowedMimeTypes(): string[] {
    return Object.keys(MIME_TO_EXTENSION);
  }

  isAllowedMimeType(mimeType?: string | null): boolean {
    if (!mimeType) return false;
    return mimeType in MIME_TO_EXTENSION;
  }

  async save(params: {
    conversationId: string;
    fileBuffer: Buffer;
    mimeType: string;
    originalFileName?: string | null;
  }): Promise<StoredGeneralChatAttachment> {
    const extension = MIME_TO_EXTENSION[params.mimeType];
    if (!extension) {
      throw new Error('Unsupported general chat attachment mime type');
    }

    const fileId = `chat_${randomUUID().replace(/-/g, '')}`; // url-safe
    const safeConversationId = this.sanitizeSegment(params.conversationId);
    const relativeDir = path.join('chat-attachments', safeConversationId);
    const absoluteDir = path.join(process.cwd(), 'storage', relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });

    const absolutePath = path.join(absoluteDir, `${fileId}${extension}`);
    const metaPath = path.join(absoluteDir, `${fileId}.json`);

    await fs.writeFile(absolutePath, params.fileBuffer);
    const stat = await fs.stat(absolutePath);

    const meta = {
      mimeType: params.mimeType,
      originalFileName: params.originalFileName ?? null,
      fileSizeBytes: stat.size,
    };
    await fs.writeFile(metaPath, JSON.stringify(meta), 'utf8');

    return {
      fileId,
      absolutePath,
      mimeType: params.mimeType,
      fileSizeBytes: stat.size,
      originalFileName: meta.originalFileName,
    };
  }

  async resolve(params: { conversationId: string; fileId: string }): Promise<{
    absolutePath: string;
    mimeType: string;
    fileSizeBytes: number;
    originalFileName: string | null;
  } | null> {
    const safeConversationId = this.sanitizeSegment(params.conversationId);
    const safeFileId = this.sanitizeSegment(params.fileId);
    const absoluteDir = path.join(
      process.cwd(),
      'storage',
      'chat-attachments',
      safeConversationId,
    );
    const metaPath = path.join(absoluteDir, `${safeFileId}.json`);
    const metaRaw = await fs.readFile(metaPath, 'utf8').catch(() => null);
    if (!metaRaw) return null;

    let meta: {
      mimeType: string;
      originalFileName: string | null;
      fileSizeBytes: number;
    };
    try {
      meta = JSON.parse(metaRaw);
    } catch {
      return null;
    }

    if (
      !meta ||
      typeof meta.mimeType !== 'string' ||
      typeof meta.fileSizeBytes !== 'number'
    ) {
      return null;
    }

    const extension = MIME_TO_EXTENSION[meta.mimeType];
    if (!extension) return null;

    const absolutePath = path.join(absoluteDir, `${safeFileId}${extension}`);
    const stat = await fs.stat(absolutePath).catch(() => null);
    if (!stat?.isFile()) return null;

    return {
      absolutePath,
      mimeType: meta.mimeType,
      fileSizeBytes: meta.fileSizeBytes,
      originalFileName: meta.originalFileName ?? null,
    };
  }

  private sanitizeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '');
  }
}
