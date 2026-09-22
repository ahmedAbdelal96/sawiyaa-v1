import type { ChatAttachmentPolicy } from "@/features/messages-shell/api/messages-shell.api";

export function formatChatAttachmentSize(bytes?: number | null) {
  if (!bytes || bytes < 1024) return bytes ? `${bytes} B` : "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function isChatImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

export function validateChatAttachment(
  file: Pick<File, "type" | "size">,
  currentCount: number,
  currentBytes: number,
  policy: ChatAttachmentPolicy,
) {
  if (!policy.enabled) return "MESSAGING_ATTACHMENT_FEATURE_DISABLED";
  const allowed = [...policy.imageTypes, ...policy.documentTypes];
  if (!allowed.includes(file.type)) return "MESSAGING_ATTACHMENT_INVALID";
  const maxBytes = isChatImage(file.type)
    ? policy.maxImageBytes
    : policy.maxDocumentBytes;
  if (file.size > maxBytes) return "MESSAGING_ATTACHMENT_TOO_LARGE";
  if (currentCount >= policy.maxFilesPerMessage) return "MESSAGING_ATTACHMENT_LIMIT_EXCEEDED";
  if (currentBytes + file.size > policy.maxCombinedBytesPerMessage) {
    return "MESSAGING_ATTACHMENT_COMBINED_SIZE_LIMIT_EXCEEDED";
  }
  return null;
}

export function chatAttachmentError(code: string, isArabic: boolean) {
  if (code.includes("TOO_LARGE")) return isArabic ? "حجم الملف أكبر من الحد المسموح." : "This file is larger than the allowed limit.";
  if (code.includes("LIMIT") || code.includes("COMBINED")) return isArabic ? "تم الوصول إلى حد المرفقات المسموح." : "The attachment limit has been reached.";
  if (code.includes("INVALID")) return isArabic ? "نوع الملف غير مدعوم." : "This file type is not supported.";
  return isArabic ? "تعذر إضافة المرفق." : "This attachment could not be added.";
}
