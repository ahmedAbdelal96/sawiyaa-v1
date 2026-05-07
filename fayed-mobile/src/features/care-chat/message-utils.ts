import type { TFunction } from "i18next";

type CareChatSystemMessageLike = {
  senderRole: string;
  message: string;
};

const APPROVAL_NOTICE_VARIANTS = [
  "Care chat request has been approved. This conversation is available while active.",
  "تمت الموافقة على طلب الدردشة المهنية. هذه المحادثة متاحة أثناء كونها نشطة.",
  "تمت الموافقة على الطلب. هذه المحادثة متاحة الآن أثناء كونها نشطة.",
];

function normalizeMessage(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function localizeCareChatMessageText(
  message: CareChatSystemMessageLike,
  t: TFunction,
) {
  const normalized = normalizeMessage(message.message);

  if (message.senderRole === "SYSTEM") {
    if (
      APPROVAL_NOTICE_VARIANTS.some(
        (variant) => normalizeMessage(variant) === normalized,
      ) ||
      (normalized.includes("approved") &&
        normalized.includes("available while active"))
    ) {
      return t("careChat.systemMessages.approvalNotice");
    }
  }

  return message.message;
}
