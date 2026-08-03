"use client";

import { useLocale } from "next-intl";
import CareChatConversationPanel from "./CareChatConversationPanel";

type Props = {
  conversationId: string;
};

export default function PatientCareChatConversationScreen({ conversationId }: Props) {
  const locale = useLocale();
  const backHref = `/${locale}/patient/care-chat`;

  return (
    <div className="h-full min-h-0 w-full overflow-hidden flex flex-col">
      <CareChatConversationPanel
        conversationId={conversationId}
        scope="patient"
        backHref={backHref}
        variant="embedded"
      />
    </div>
  );
}
