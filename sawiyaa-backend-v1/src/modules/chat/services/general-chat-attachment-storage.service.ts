import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { StoredFilePurpose } from '@prisma/client';
import { UnifiedFileStorageService } from '@modules/files/unified-file-storage.service';
import { CHAT_DOCUMENT_MIME_TYPES, CHAT_IMAGE_MIME_TYPES } from '@modules/files/file.types';

export type StoredGeneralChatAttachment = {
  fileId: string;
  absolutePath: string;
  mimeType: string;
  fileSizeBytes: number;
  originalFileName: string | null;
};

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx', 'text/plain': '.txt',
};

@Injectable()
export class GeneralChatAttachmentStorageService {
  private readonly legacyBaseDir = path.resolve(process.cwd(), 'storage', 'chat-attachments');

  constructor(private readonly files: UnifiedFileStorageService) {}

  getAllowedMimeTypes(): string[] { return [...CHAT_IMAGE_MIME_TYPES, ...CHAT_DOCUMENT_MIME_TYPES]; }
  isAllowedMimeType(mimeType?: string | null): boolean { return !!mimeType && mimeType in MIME_TO_EXTENSION; }

  async save(params: { conversationId: string; fileBuffer: Buffer; mimeType: string; originalFileName?: string | null; uploadedByUserId?: string | null }): Promise<StoredGeneralChatAttachment> {
    const stored = await this.files.store({ purpose: StoredFilePurpose.CHAT_ATTACHMENT, fileBuffer: params.fileBuffer, mimeType: params.mimeType, originalFileName: params.originalFileName, uploadedByUserId: params.uploadedByUserId, chatConversationId: params.conversationId });
    return { fileId: stored.id, absolutePath: stored.absolutePath, mimeType: stored.mimeType, fileSizeBytes: stored.sizeBytes, originalFileName: stored.originalFileName };
  }

  async resolve(params: { conversationId: string; fileId: string }): Promise<StoredGeneralChatAttachment | null> {
    const stored = await this.files.resolve(params.fileId);
    if (stored?.purpose === StoredFilePurpose.CHAT_ATTACHMENT) return { fileId: stored.id, absolutePath: stored.absolutePath, mimeType: stored.mimeType, fileSizeBytes: stored.sizeBytes, originalFileName: stored.originalFileName };
    return this.resolveLegacy(params);
  }

  resolveStoredFile(fileId: string) {
    return this.files.resolve(fileId);
  }

  private async resolveLegacy(params: { conversationId: string; fileId: string }): Promise<StoredGeneralChatAttachment | null> {
    const conversationId = params.conversationId.replace(/[^a-zA-Z0-9_-]/g, '');
    const fileId = params.fileId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!conversationId || !fileId) return null;
    const directory = path.join(this.legacyBaseDir, conversationId);
    const metaPath = path.join(directory, `${fileId}.json`);
    const raw = await fs.readFile(metaPath, 'utf8').catch(() => null);
    if (!raw) return null;
    let meta: { mimeType?: string; originalFileName?: string | null; fileSizeBytes?: number };
    try { meta = JSON.parse(raw); } catch { return null; }
    const extension = meta.mimeType ? MIME_TO_EXTENSION[meta.mimeType] : null;
    if (!extension || typeof meta.fileSizeBytes !== 'number') return null;
    const absolutePath = path.join(directory, `${fileId}${extension}`);
    const stat = await fs.stat(absolutePath).catch(() => null);
    return stat?.isFile() ? { fileId: params.fileId, absolutePath, mimeType: meta.mimeType!, fileSizeBytes: stat.size, originalFileName: meta.originalFileName ?? null } : null;
  }
}
