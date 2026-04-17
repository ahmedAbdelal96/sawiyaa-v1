import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { useAddSupportMessage, useSupportTicket } from "@/modules/support/hooks/use-support";
import {
  AppCard,
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

function getRoleLabel(role: string, t: (key: string) => string) {
  switch (role) {
    case "PATIENT":
      return t("supportRoleYou");
    case "SUPPORT_AGENT":
      return t("supportRoleSupport");
    case "ADMIN":
      return t("supportRoleSupport");
    default:
      return role;
  }
}

export function SupportTicketDetailsScreen() {
  const { t } = useTranslation();
  const { spacing, colors } = useAppTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const ticketId = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const ticketQuery = useSupportTicket(ticketId);
  const addMessageMutation = useAddSupportMessage(ticketId);

  const formatDayLabel = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(iso));

  if (!ticketId) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  if (ticketQuery.isLoading) {
    return (
      <AppScreen>
        <AppLoader label={t("loading")} />
      </AppScreen>
    );
  }

  if (ticketQuery.isError) {
    return (
      <AppScreen>
        <AppErrorState onRetry={() => ticketQuery.refetch()} />
      </AppScreen>
    );
  }

  if (!ticketQuery.data) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={{ flex: 1, gap: spacing.md }}>
        <AppHeader title={ticketQuery.data.subject} subtitle={t(`supportStatus_${ticketQuery.data.status}`)} />

        <AppCard>
          <View style={{ gap: spacing.sm }}>
            <AppText color={colors.textSecondary}>
              {t(`supportCategory_${ticketQuery.data.category}`)}
            </AppText>
            <AppText color={colors.textSecondary}>
              {t("supportTicketPriorityLabel")}: {t(`supportPriority_${ticketQuery.data.priority}`)}
            </AppText>
            {ticketQuery.data.description ? (
              <AppText color={colors.textSecondary}>{ticketQuery.data.description}</AppText>
            ) : null}
          </View>
        </AppCard>

        <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
          {ticketQuery.data.messages.length === 0 ? (
            <AppEmptyState
              title={t("supportMessagesEmptyTitle")}
              description={t("supportMessagesEmptyDescription")}
            />
          ) : (
            ticketQuery.data.messages.map((message, index, list) => {
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
                    roleLabel={getRoleLabel(message.senderRole, t)}
                    align={message.senderRole === "PATIENT" ? "right" : "left"}
                  />
                </View>
              );
            })
          )}
        </ScrollView>

        <MessageComposer
          loading={addMessageMutation.isPending}
          onSend={(message) => addMessageMutation.mutate(message)}
          placeholder={t("supportMessagePlaceholder")}
        />

        {addMessageMutation.isError ? <AppErrorState /> : null}
      </View>
    </AppScreen>
  );
}
