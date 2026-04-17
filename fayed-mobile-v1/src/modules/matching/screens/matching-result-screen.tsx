import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { useAppTheme } from "@/core/theme/theme-provider";
import { MatchingResultCard } from "@/modules/matching/components/matching-result-card";
import { useMatchingSession } from "@/modules/matching/hooks/use-matching";
import {
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppLoader,
  AppScreen,
} from "@/shared/ui";

export function MatchingResultScreen() {
  const { t } = useTranslation();
  const { spacing } = useAppTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const matchingQuery = useMatchingSession(id);

  if (matchingQuery.isLoading) {
    return (
      <AppScreen>
        <AppLoader label={t("loading")} />
      </AppScreen>
    );
  }

  if (matchingQuery.isError) {
    return (
      <AppScreen>
        <AppErrorState onRetry={() => matchingQuery.refetch()} />
      </AppScreen>
    );
  }

  if (!matchingQuery.data || matchingQuery.data.items.length === 0) {
    return (
      <AppScreen>
        <AppHeader title={t("matchingResultTitle")} subtitle={t("matchingResultSubtitle")} />
        <AppEmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader title={t("matchingResultTitle")} subtitle={t("matchingResultSubtitle")} />
        {matchingQuery.data.items.map((item) => (
          <MatchingResultCard key={`${item.practitioner.id}-${item.rank}`} item={item} />
        ))}
      </View>
    </AppScreen>
  );
}
