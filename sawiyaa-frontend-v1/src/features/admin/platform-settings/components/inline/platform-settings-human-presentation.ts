import type { PlatformSetting } from "../../types/platform-settings.types";

export const SESSION_REMINDER_OFFSETS_KEY = "SESSION_REMINDER_OFFSETS_MINUTES";

type SettingPresentation = {
  label: string;
  description: string;
};

const FILE_PRESENTATION: Record<string, SettingPresentation> = {
  "file.uploads.chat.enabled": {
    label: "السماح بمرفقات المحادثة",
    description: "السماح بإرسال الصور والمستندات داخل محادثات الرعاية.",
  },
  "file.uploads.chat.allowedImageMimeTypes": {
    label: "أنواع الصور المسموح بها",
    description: "اختر صيغ الصور التي يمكن إرسالها في المحادثة.",
  },
  "file.uploads.chat.allowedDocumentMimeTypes": {
    label: "أنواع المستندات المسموح بها",
    description: "اختر صيغ المستندات التي يمكن إرسالها في المحادثة.",
  },
  "file.uploads.chat.maxImageBytes": {
    label: "أقصى حجم لصورة المحادثة",
    description: "الحجم الأقصى للصورة الواحدة داخل المحادثة.",
  },
  "file.uploads.chat.maxDocumentBytes": {
    label: "أقصى حجم لمستند المحادثة",
    description: "الحجم الأقصى للمستند الواحد داخل المحادثة.",
  },
  "file.uploads.chat.maxFilesPerMessage": {
    label: "أقصى عدد ملفات في الرسالة",
    description: "عدد الملفات التي يمكن إرفاقها في رسالة واحدة.",
  },
  "file.uploads.chat.maxCombinedBytes": {
    label: "الحد الأقصى لإجمالي حجم الملفات",
    description: "الحجم الإجمالي الأقصى لمرفقات الرسالة الواحدة.",
  },
};

const FILE_GROUP_PRESENTATION: Record<
  string,
  { subject: string; plural: string }
> = {
  "practitioner-avatar": { subject: "صورة الملف الشخصي للممارس", plural: "صور الممارسين" },
  "practitioner-credential": { subject: "وثيقة الاعتماد", plural: "وثائق الاعتماد" },
  "user-avatar": { subject: "صورة الحساب", plural: "صور الحسابات" },
  "patient-avatar": { subject: "صورة ملف المريض", plural: "صور ملفات المرضى" },
  "article-cover": { subject: "غلاف المقال", plural: "أغلفة المقالات" },
  "academy-program-cover": { subject: "غلاف البرنامج التدريبي", plural: "أغلفة البرامج التدريبية" },
  "academy-certificate": { subject: "شهادة الأكاديمية", plural: "شهادات الأكاديمية" },
};

const MIME_LABELS: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/gif": "GIF",
  "application/pdf": "PDF",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word",
  "application/vnd.ms-excel": "Excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "Excel",
  "application/vnd.ms-powerpoint": "PowerPoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PowerPoint",
  "text/plain": "نص",
};

const CHANNEL_LABELS: Record<string, { ar: string; en: string }> = {
  EMAIL: { ar: "البريد الإلكتروني", en: "Email" },
  IN_APP: { ar: "داخل التطبيق", en: "In-app" },
  PUSH: { ar: "الإشعارات الفورية", en: "Push notifications" },
  SMS: { ar: "الرسائل النصية", en: "SMS" },
};

export function getSettingPresentation(
  setting: Pick<PlatformSetting, "key" | "label" | "labelAr" | "description" | "descriptionAr">,
  isAr: boolean,
): SettingPresentation {
  const direct = FILE_PRESENTATION[setting.key];
  if (direct && isAr) return direct;

  const fileMatch = setting.key.match(/^file\.uploads\.([^\.]+)\.(enabled|allowedMimeTypes|maxBytes)$/);
  if (fileMatch && isAr) {
    const group = FILE_GROUP_PRESENTATION[fileMatch[1]];
    if (group) {
      if (fileMatch[2] === "enabled") {
        return {
          label: `السماح برفع ${group.plural}`,
          description: `السماح بإضافة ${group.plural} إلى ملفات المستخدمين.`,
        };
      }
      if (fileMatch[2] === "allowedMimeTypes") {
        return {
          label: `أنواع ${group.subject} المسموح بها`,
          description: `اختر صيغ الملفات المقبولة لـ${group.subject}.`,
        };
      }
      return {
        label: `أقصى حجم لـ${group.subject}`,
        description: `الحجم الأقصى لملف ${group.subject}.`,
      };
    }
  }

  if (setting.key === "SESSION_LATE_REMINDER_MINUTES_AFTER_START" && isAr) {
    return {
      label: "إرسال تنبيه التأخر بعد بداية الجلسة بـ",
      description: "عدد الدقائق قبل إرسال تنبيه للمشارك الذي لم يدخل الجلسة.",
    };
  }

  return {
    label: isAr ? setting.labelAr || setting.label : setting.label,
    description: isAr
      ? setting.descriptionAr || setting.description
      : setting.description,
  };
}

export function formatReminderOffset(value: number, isAr: boolean) {
  if (value === 0) return isAr ? "عند بداية الجلسة" : "At session start";
  return isAr ? `${value} دقيقة قبل الجلسة` : `${value} minutes before the session`;
}

export function isMimeSetting(setting: Pick<PlatformSetting, "key">) {
  const key = setting.key.toLowerCase();
  return key.includes("mimetype") || key.includes("mimetypes");
}

export function formatMimeLabel(value: unknown, isAr: boolean) {
  const raw = String(value ?? "");
  const known = MIME_LABELS[raw];
  if (known) return known;
  if (raw.startsWith("image/")) return isAr ? "صورة" : "Image";
  if (raw.startsWith("video/")) return isAr ? "فيديو" : "Video";
  if (raw.startsWith("audio/")) return isAr ? "ملف صوتي" : "Audio";
  if (raw.includes("pdf")) return isAr ? "مستند PDF" : "PDF document";
  if (raw.includes("word")) return isAr ? "مستند Word" : "Word document";
  if (raw.includes("sheet")) return isAr ? "جدول بيانات" : "Spreadsheet";
  if (raw.includes("presentation")) return isAr ? "عرض تقديمي" : "Presentation";
  return isAr ? "نوع ملف" : "File type";
}

export function formatListItem(
  setting: Pick<PlatformSetting, "key">,
  value: unknown,
  isAr: boolean,
) {
  if (isMimeSetting(setting) || String(value ?? "").includes("/")) {
    return formatMimeLabel(value, isAr);
  }
  const channel = CHANNEL_LABELS[String(value)];
  if (channel) return isAr ? channel.ar : channel.en;
  return String(value ?? "");
}

export function formatHumanSettingValue(
  setting: Pick<PlatformSetting, "key" | "uiMetadata">,
  value: unknown,
  isAr: boolean,
) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") {
    return value ? (isAr ? "مفعّل" : "Enabled") : isAr ? "معطّل" : "Disabled";
  }
  if (typeof value === "number" && setting.key.toLowerCase().includes("bytes")) {
    const mb = value / (1024 * 1024);
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  }
  if (setting.key === SESSION_REMINDER_OFFSETS_KEY && Array.isArray(value)) {
    return value
      .map((item) => formatReminderOffset(Number(item), isAr))
      .join(", ");
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => formatListItem(setting, item, isAr))
      .join(", ");
  }
  if (typeof value === "object") return isAr ? "تفاصيل متقدمة" : "Advanced details";
  if (setting.uiMetadata?.control === "percentage") return `${value} %`;
  if (setting.uiMetadata?.control === "duration") {
    return `${value} ${isAr ? "دقيقة" : "minutes"}`;
  }
  const channel = CHANNEL_LABELS[String(value)];
  if (channel) return isAr ? channel.ar : channel.en;
  return String(value);
}
