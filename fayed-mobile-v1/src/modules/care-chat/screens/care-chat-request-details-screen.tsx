import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import { useCareChatRequest } from "@/modules/care-chat/hooks/use-care-chat";
import { AppButton, AppCard, AppEmptyState, AppErrorState, AppHeader, AppLoader, AppScreen, AppText } from "@/shared/ui";

export function CareChatRequestDetailsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { spacing, colors } = useAppTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const requestId = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const requestQuery = useCareChatRequest(requestId);

  if (!requestId) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  if (requestQuery.isLoading) {
    return (
      <AppScreen>
        <AppLoader label={t("loading")} />
      </AppScreen>
    );
  }

  if (requestQuery.isError) {
    return (
      <AppScreen>
        <AppErrorState onRetry={() => requestQuery.refetch()} />
      </AppScreen>
    );
  }

  if (!requestQuery.data) {
    return (
      <AppScreen>
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  const canOpenConversation =
    requestQuery.data.status === "APPROVED" && Boolean(requestQuery.data.linkedConversationId);

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader
          title={t("careChatRequestDetailsTitle")}
          subtitle={t(`careChatStatus_${requestQuery.data.status}`)}
        />
        <AppCard>
          <View style={{ gap: spacing.sm }}>
            <AppText color={colors.textSecondary}>
              {requestQuery.data.practitioner.displayName || "-"}
            </AppText>
            {requestQuery.data.reason ? (
              <AppText color={colors.textSecondary}>{requestQuery.data.reason}</AppText>
            ) : null}
            <AppText color={colors.textSecondary}>
              {t("careChatRequestedAtLabel")}: {new Date(requestQuery.data.requestedAt).toLocaleString()}
            </AppText>
          </View>
        </AppCard>
        {canOpenConversation ? (
          <AppButton
            label={t("careChatOpenConversation")}
            onPress={() =>
              router.push(routes.app.careChatConversation(requestQuery.data.linkedConversationId!))
            }
          />
        ) : (
          <AppCard>
            <AppText color={colors.textSecondary}>{t("careChatPendingConversationHint")}</AppText>
          </AppCard>
        )}
      </View>
    </AppScreen>
  );
}
