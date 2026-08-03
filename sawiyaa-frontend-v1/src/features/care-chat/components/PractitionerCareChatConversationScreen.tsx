"use client";

import { useLocale } from "next-intl";
import CareChatConversationPanel from "./CareChatConversationPanel";

type Props = {
  conversationId: string;
};

export default function PractitionerCareChatConversationScreen({ conversationId }: Props) {
  const locale = useLocale();
  const backHref = `/${locale}/practitioner/care-chat`;

  return (
    <div className="h-full min-h-0 w-full overflow-hidden flex flex-col">
      <CareChatConversationPanel
        conversationId={conversationId}
        scope="practitioner"
        backHref={backHref}
        variant="embedded"
      />
    </div>
  );
}
