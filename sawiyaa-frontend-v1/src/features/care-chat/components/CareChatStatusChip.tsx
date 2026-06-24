"use client";

import { useTranslations } from "next-intl";
import {
  CARE_CHAT_ACTIVITY_STYLES,
  CARE_CHAT_REQUEST_STATUS_STYLES,
} from "../lib/care-chat-ui";
import type {
  CareChatActivityState,
  CareChatRequestStatus,
} from "../types/care-chat.types";

export function CareChatRequestStatusChip({ status }: { status: CareChatRequestStatus }) {
  const t = useTranslations("care-chat");
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${CARE_CHAT_REQUEST_STATUS_STYLES[status]}`}
    >
      {t(`common.requestStatuses.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}

export function CareChatActivityChip({
  activityState,
}: {
  activityState: CareChatActivityState;
}) {
  const t = useTranslations("care-chat");
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${CARE_CHAT_ACTIVITY_STYLES[activityState]}`}
    >
      {t(`common.activityStates.${activityState}` as Parameters<typeof t>[0])}
    </span>
  );
}
