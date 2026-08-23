import { extractApiErrorCode } from "../../lib/api";
import type { ChatAttachmentPolicy, CanonicalMessageAttachment } from "./types";

export type PendingChatAttachment = {
  localId: string;
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
  state: "selected" | "uploading" | "ready" | "failed";
  errorCode?: string | null;
  remote?: CanonicalMessageAttachment;
};

export function formatAttachmentSize(bytes?: number | null) {
  if (!bytes || bytes < 1024) return bytes ? `${bytes} B` : "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function attachmentKindLabel(mimeType: string, isArabic: boolean) {
  if (mimeType.startsWith("image/")) return isArabic ? "صورة" : "Image";
  if (mimeType === "application/pdf") return "PDF";
  return isArabic ? "ملف" : "File";
}

export function isAttachmentImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

export function validatePendingAttachment(
  item: Pick<PendingChatAttachment, "mimeType" | "size">,
  current: PendingChatAttachment[],
  policy: ChatAttachmentPolicy,
) {
  if (!policy.enabled) return "MESSAGING_ATTACHMENT_FEATURE_DISABLED";
  const allowed = [...policy.imageTypes, ...policy.documentTypes];
  if (!allowed.includes(item.mimeType)) return "MESSAGING_ATTACHMENT_INVALID";
  const maxBytes = item.mimeType.startsWith("image/")
    ? policy.maxImageBytes
    : policy.maxDocumentBytes;
  if (item.size != null && item.size > maxBytes) return "MESSAGING_ATTACHMENT_TOO_LARGE";
  if (current.length >= policy.maxFilesPerMessage) return "MESSAGING_ATTACHMENT_LIMIT_EXCEEDED";
  const combined = current.reduce((total, attachment) => total + (attachment.size ?? 0), 0) + (item.size ?? 0);
  if (combined > policy.maxCombinedBytesPerMessage) return "MESSAGING_ATTACHMENT_COMBINED_SIZE_LIMIT_EXCEEDED";
  return null;
}

export function attachmentErrorCode(error: unknown) {
  return extractApiErrorCode(error) ?? "MESSAGING_ATTACHMENT_INVALID";
}

export function attachmentErrorKey(code: string | null | undefined) {
  if (code === "MESSAGING_ATTACHMENT_FEATURE_DISABLED" || code === "FILE_UPLOADS_DISABLED") return "messages.thread.attachmentGenericError";
  if (code === "MESSAGING_ATTACHMENT_TOO_LARGE" || code === "FILE_TOO_LARGE") return "messages.thread.attachmentSizeError";
  if (code === "MESSAGING_ATTACHMENT_LIMIT_EXCEEDED" || code === "MESSAGING_ATTACHMENT_COMBINED_SIZE_LIMIT_EXCEEDED") return "messages.thread.attachmentLimitError";
  if (code === "MESSAGING_ATTACHMENT_INVALID" || code === "FILE_MIME_TYPE_NOT_ALLOWED") return "messages.thread.attachmentTypeError";
  return "messages.thread.attachmentGenericError";
}

export function safeAttachmentName(name: string | null | undefined, mimeType: string) {
  const fallback = mimeType === "application/pdf" ? "attachment.pdf" : "attachment";
  const normalized = (name ?? fallback).replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim();
  return normalized || fallback;
}
