import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import type { MatchingRecommendation } from "@/modules/matching/domain/matching.types";
import { AppButton, AppCard, AppText } from "@/shared/ui";

type MatchingResultCardProps = {
  item: MatchingRecommendation;
};

export function MatchingResultCard({ item }: MatchingResultCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing } = useAppTheme();

  return (
    <AppCard>
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="title" style={{ fontWeight: "800" }}>
            {item.practitioner.displayName || "-"}
          </AppText>
          <AppText color={colors.textSecondary}>
            {item.practitioner.professionalTitle || "-"}
          </AppText>
          <AppText variant="bodySmall" color={colors.textMuted}>
            {`Score ${item.score}`}
          </AppText>
        </View>

        {item.rationale.notes.length > 0 ? (
          <AppText color={colors.textSecondary}>{item.rationale.notes.join(" • ")}</AppText>
        ) : null}

        <AppButton
          label={t("viewProfile")}
          onPress={() => router.push(routes.app.practitionerDetails(item.practitioner.slug))}
        />
      </View>
    </AppCard>
  );
}
