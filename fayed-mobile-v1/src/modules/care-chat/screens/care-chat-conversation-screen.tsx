import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { useCareChatConversation, useSendCareChatMessage } from "@/modules/care-chat/hooks/use-care-chat";
import {
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppLoader,
  AppScreen,
  AppText,
  ConversationMessageBubble,
  MessageDaySeparator,
  MessageComposer,
} from "@/shared/ui";

function mapRoleLabel(role: string, t: (key: string) => string) {
  switch (role) {
    case "PATIENT":
      return t("careChatRoleYou");
    case "PRACTITIONER":
      return t("careChatRolePractitioner");
    default:
      return role;
  }
}

export function CareChatConversationScreen() {
  const { t } = useTranslation();
  const { spacing } = useAppTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const conversationQuery = useCareChatConversation(conversationId);
  const sendMessageMutation = useSendCareChatMessage(conversationId);
  const formatDayLabel = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(iso));

  if (!conversationId) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  if (conversationQuery.isLoading) {
    return (
      <AppScreen>
        <AppLoader label={t("loading")} />
      </AppScreen>
    );
  }

  if (conversationQuery.isError) {
    return (
      <AppScreen>
        <AppErrorState onRetry={() => conversationQuery.refetch()} />
      </AppScreen>
    );
  }

  if (!conversationQuery.data) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={{ flex: 1, gap: spacing.md }}>
        <AppHeader
          title={t("careChatConversationTitle")}
          subtitle={t(`careChatConversationStatus_${conversationQuery.data.status}`)}
        />
        <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
          {conversationQuery.data.messages.length === 0 ? (
            <AppEmptyState
              title={t("careChatConversationEmptyTitle")}
              description={t("careChatConversationEmptyDescription")}
            />
          ) : (
            conversationQuery.data.messages.map((message, index, list) => {
              const previous = list[index - 1];
              const currentDay = new Date(message.createdAt).toDateString();
              const previousDay = previous ? new Date(previous.createdAt).toDateString() : null;
              const showDaySeparator = currentDay !== previousDay;

              return (
                <View key={message.id} style={{ gap: spacing.xs }}>
                  {showDaySeparator ? (
                    <MessageDaySeparator dateLabel={formatDayLabel(message.createdAt)} />
                  ) : null}
                  <ConversationMessageBubble
                    message={message.message}
                    createdAt={message.createdAt}
                    roleLabel={mapRoleLabel(message.senderRole, t)}
                    align={message.senderRole === "PATIENT" ? "right" : "left"}
                  />
                </View>
              );
            })
          )}
        </ScrollView>

        {conversationQuery.data.canSendMessage ? (
          <MessageComposer
            loading={sendMessageMutation.isPending}
            onSend={(message) => sendMessageMutation.mutate(message)}
            placeholder={t("careChatMessagePlaceholder")}
          />
        ) : (
          <AppText>{t("careChatConversationReadOnly")}</AppText>
        )}
        {sendMessageMutation.isError ? <AppErrorState /> : null}
      </View>
    </AppScreen>
  );
}
