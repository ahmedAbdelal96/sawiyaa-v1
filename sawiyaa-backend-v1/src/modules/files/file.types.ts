import { StoredFilePurpose, StoredFileStatus } from '@prisma/client';

export const HARD_UPLOAD_CEILING_BYTES = 25 * 1024 * 1024;

export const FILE_MIME_CATALOG = Object.freeze({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    '.pptx',
  'text/plain': '.txt',
} as const);

export type SupportedFileMimeType = keyof typeof FILE_MIME_CATALOG;

export type StoredFileRecord = {
  id: string;
  storageKey: string;
  originalFileName: string | null;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  sha256: string;
  purpose: StoredFilePurpose;
  status: StoredFileStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  chatConversationId?: string | null;
};

export type StoredFileWithPath = StoredFileRecord & {
  absolutePath: string;
};

export type StoreFileInput = {
  purpose: StoredFilePurpose;
  fileBuffer: Buffer;
  mimeType: string;
  originalFileName?: string | null;
  uploadedByUserId?: string | null;
  chatConversationId?: string | null;
  maxBytes?: number;
  allowedMimeTypes?: readonly string[];
};

export const PURPOSE_DIRECTORY: Record<StoredFilePurpose, string> = {
  USER_AVATAR: 'user-avatars',
  PATIENT_AVATAR: 'patient-avatars',
  PRACTITIONER_AVATAR: 'practitioner-avatars',
  PRACTITIONER_CREDENTIAL: 'practitioner-credentials',
  CHAT_ATTACHMENT: 'chat-attachments',
  PAYOUT_PROOF: 'payout-proofs',
  ARTICLE_COVER: 'article-covers',
  ACADEMY_PROGRAM_COVER: 'academy-program-covers',
  ACADEMY_CERTIFICATE: 'academy-certificates',
};

export const CHAT_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const CHAT_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
] as const;

export const DEFAULT_FILE_LIMITS = Object.freeze({
  USER_AVATAR: 512 * 1024,
  PATIENT_AVATAR: 5 * 1024 * 1024,
  PRACTITIONER_AVATAR: 5 * 1024 * 1024,
  PRACTITIONER_CREDENTIAL: 5 * 1024 * 1024,
  CHAT_ATTACHMENT: 10 * 1024 * 1024,
  PAYOUT_PROOF: 10 * 1024 * 1024,
  ARTICLE_COVER: 10 * 1024 * 1024,
  ACADEMY_PROGRAM_COVER: 10 * 1024 * 1024,
  ACADEMY_CERTIFICATE: 10 * 1024 * 1024,
} satisfies Record<StoredFilePurpose, number>);
