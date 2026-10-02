import { Injectable, Optional } from '@nestjs/common';
import { StoredFilePurpose } from '@prisma/client';
import { ConfigRuntimeService } from '@modules/config/services/config-runtime.service';
import {
  CHAT_DOCUMENT_MIME_TYPES,
  CHAT_IMAGE_MIME_TYPES,
  DEFAULT_FILE_LIMITS,
} from './file.types';

const CONFIG_KEYS = {
  chatEnabled: 'file.uploads.chat.enabled',
  chatImages: 'file.uploads.chat.allowedImageMimeTypes',
  chatDocuments: 'file.uploads.chat.allowedDocumentMimeTypes',
  chatImageBytes: 'file.uploads.chat.maxImageBytes',
  chatDocumentBytes: 'file.uploads.chat.maxDocumentBytes',
  chatFiles: 'file.uploads.chat.maxFilesPerMessage',
  chatCombinedBytes: 'file.uploads.chat.maxCombinedBytes',
} as const;

@Injectable()
export class FilePolicyService {
  constructor(@Optional() private readonly config?: ConfigRuntimeService) {}

  async getPolicy(purpose: StoredFilePurpose, mimeType?: string) {
    if (purpose !== StoredFilePurpose.CHAT_ATTACHMENT) {
      const slug = purpose.toLowerCase().replace(/_/g, '-');
      const [enabled, allowedMimeTypes, maxBytes] = await Promise.all([
        this.getBoolean(`file.uploads.${slug}.enabled`, true),
        this.getStringArray(
          `file.uploads.${slug}.allowedMimeTypes`,
          this.defaultAllowedMimeTypes(purpose),
        ),
        this.getNumber(
          `file.uploads.${slug}.maxBytes`,
          DEFAULT_FILE_LIMITS[purpose],
        ),
      ]);
      return { enabled, allowedMimeTypes, maxBytes };
    }

    const isImage = mimeType?.startsWith('image/') ?? false;
    const [enabled, images, documents, imageBytes, documentBytes] =
      await Promise.all([
        this.getBoolean(CONFIG_KEYS.chatEnabled, true),
        this.getStringArray(CONFIG_KEYS.chatImages, [...CHAT_IMAGE_MIME_TYPES]),
        this.getStringArray(CONFIG_KEYS.chatDocuments, [
          ...CHAT_DOCUMENT_MIME_TYPES,
        ]),
        this.getNumber(
          CONFIG_KEYS.chatImageBytes,
          DEFAULT_FILE_LIMITS.CHAT_ATTACHMENT,
        ),
        this.getNumber(
          CONFIG_KEYS.chatDocumentBytes,
          DEFAULT_FILE_LIMITS.CHAT_ATTACHMENT,
        ),
      ]);
    return {
      enabled,
      allowedMimeTypes: [...images, ...documents],
      maxBytes: isImage ? imageBytes : documentBytes,
    };
  }

  async getChatLimits() {
    const policy = await this.getChatAttachmentPolicy();
    return {
      enabled: policy.enabled,
      maxFilesPerMessage: policy.maxFilesPerMessage,
      maxCombinedBytes: policy.maxCombinedBytesPerMessage,
    };
  }

  async getChatAttachmentPolicy() {
    const [
      enabled,
      imageTypes,
      documentTypes,
      maxImageBytes,
      maxDocumentBytes,
      maxFilesPerMessage,
      maxCombinedBytesPerMessage,
    ] = await Promise.all([
      this.getBoolean(CONFIG_KEYS.chatEnabled, true),
      this.getStringArray(CONFIG_KEYS.chatImages, [...CHAT_IMAGE_MIME_TYPES]),
      this.getStringArray(CONFIG_KEYS.chatDocuments, [
        ...CHAT_DOCUMENT_MIME_TYPES,
      ]),
      this.getNumber(
        CONFIG_KEYS.chatImageBytes,
        DEFAULT_FILE_LIMITS.CHAT_ATTACHMENT,
      ),
      this.getNumber(
        CONFIG_KEYS.chatDocumentBytes,
        DEFAULT_FILE_LIMITS.CHAT_ATTACHMENT,
      ),
      this.getNumber(CONFIG_KEYS.chatFiles, 3),
      this.getNumber(CONFIG_KEYS.chatCombinedBytes, 20 * 1024 * 1024),
    ]);

    return {
      enabled,
      imageTypes,
      documentTypes,
      maxImageBytes,
      maxDocumentBytes,
      maxFilesPerMessage,
      maxCombinedBytesPerMessage,
    };
  }

  private defaultAllowedMimeTypes(purpose: StoredFilePurpose): string[] {
    switch (purpose) {
      case StoredFilePurpose.PRACTITIONER_CREDENTIAL:
      case StoredFilePurpose.PAYOUT_PROOF:
        return ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      case StoredFilePurpose.ACADEMY_CERTIFICATE:
        return ['application/pdf'];
      default:
        return ['image/jpeg', 'image/png', 'image/webp'];
    }
  }

  private async getBoolean(key: string, fallback: boolean): Promise<boolean> {
    try {
      return (await this.config?.getBoolean(key as never)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  private async getNumber(key: string, fallback: number): Promise<number> {
    try {
      return (await this.config?.getNumber(key as never)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  private async getStringArray(
    key: string,
    fallback: string[],
  ): Promise<string[]> {
    try {
      const value = await this.config?.getJson<unknown>(key as never);
      return Array.isArray(value) &&
        value.every((item) => typeof item === 'string')
        ? value
        : fallback;
    } catch {
      return fallback;
    }
  }
}
