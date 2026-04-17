import { LinearGradient } from "expo-linear-gradient";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import { useJourneySummary } from "@/modules/journey/hooks/use-journey-summary";
import { AppButton, AppCard, AppEmptyState, AppErrorState, AppLoader, AppText } from "@/shared/ui";

function mapActionToRoute(action: string): Href {
  switch (action) {
    case "COMPLETE_PAYMENT":
      return routes.app.payments;
    case "JOIN_UPCOMING_SESSION":
      return routes.app.sessions;
    case "VIEW_SUPPORT_TICKET":
      return routes.app.supportTickets;
    case "START_GUIDED_MATCHING":
      return routes.app.matching;
    case "BOOK_NEXT_SESSION":
      return routes.app.practitioners;
    case "TAKE_ASSESSMENT":
      return routes.app.matching;
    default:
      return routes.app.home;
  }
}

function mapActionLabel(action: string, t: (key: string) => string): string {
  switch (action) {
    case "COMPLETE_PAYMENT":
      return t("openPayments");
    case "JOIN_UPCOMING_SESSION":
      return t("openSessions");
    case "VIEW_SUPPORT_TICKET":
      return t("openSupport");
    case "START_GUIDED_MATCHING":
      return t("openMatching");
    case "BOOK_NEXT_SESSION":
      return t("exploreSpecialists");
    case "TAKE_ASSESSMENT":
      return t("openMatching");
    default:
      return t("openProfile");
  }
}

function mapActionSummary(action: string, t: (key: string) => string): string {
  switch (action) {
    case "COMPLETE_PAYMENT":
      return t("paymentReturnPendingHint");
    case "JOIN_UPCOMING_SESSION":
      return t("sessionJoinSubtitle");
    case "VIEW_SUPPORT_TICKET":
      return t("supportTicketsSubtitle");
    case "START_GUIDED_MATCHING":
    case "TAKE_ASSESSMENT":
      return t("matchingSubtitle");
    case "BOOK_NEXT_SESSION":
      return t("bookingSubtitle");
    default:
      return t("journeyCardDescription");
  }
}

function mapActionHeadline(action: string, t: (key: string) => string): string {
  switch (action) {
    case "COMPLETE_PAYMENT":
      return t("openPayments");
    case "JOIN_UPCOMING_SESSION":
      return t("sessionJoinTitle");
    case "VIEW_SUPPORT_TICKET":
      return t("openSupport");
    case "START_GUIDED_MATCHING":
    case "TAKE_ASSESSMENT":
      return t("matchingTitle");
    case "BOOK_NEXT_SESSION":
      return t("bookingTitle");
    default:
      return t("journeyCardTitle");
  }
}

export function JourneyHomeContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const journeyQuery = useJourneySummary();

  if (journeyQuery.isLoading) {
    return <AppLoader label={t("journeyLoadingDescription")} />;
  }

  if (journeyQuery.isError) {
    return <AppErrorState onRetry={() => journeyQuery.refetch()} />;
  }

  if (!journeyQuery.data) {
    return <AppEmptyState title={t("journeyEmptyTitle")} description={t("journeyEmptyDescription")} />;
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <AppCard style={{ backgroundColor: "transparent", padding: 0 }}>
        <LinearGradient
          colors={[colors.primary, colors.primaryContainer]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={{
            borderRadius: 32,
            gap: spacing.sm,
            padding: spacing.xl,
          }}
        >
          <AppText variant="title" style={{ fontWeight: "700" }}>
            {t("journeyCardTitle")}
          </AppText>
          <AppText color="#F4F7FF">
            {mapActionHeadline(journeyQuery.data.suggestedNextAction, t)}
          </AppText>
          <AppText color="#F4F7FF">
            {mapActionSummary(journeyQuery.data.suggestedNextAction, t)}
          </AppText>
        </LinearGradient>
      </AppCard>

      <AppCard style={{ backgroundColor: colors.surfaceLow }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="bodySmall" color={colors.textMuted}>
            {t("journeyCardTitle")}
          </AppText>
          <AppText color={colors.textSecondary}>
            {mapActionSummary(journeyQuery.data.suggestedNextAction, t)}
          </AppText>
          <AppButton
            label={mapActionLabel(journeyQuery.data.suggestedNextAction, t)}
            onPress={() => router.push(mapActionToRoute(journeyQuery.data.suggestedNextAction))}
          />
        </View>
      </AppCard>
    </View>
  );
}
