import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image, Pressable, View } from "react-native";

import { routes } from "@/core/constants/routes";
import { stitchAssets } from "@/core/constants/stitch-assets";
import { useAppTheme } from "@/core/theme/theme-provider";
import type { PractitionerListItem } from "@/modules/practitioners/domain/practitioners.types";
import { AppText } from "@/shared/ui";

type PractitionerListCardProps = {
  practitioner: PractitionerListItem;
};

function formatPrice(value: number | null) {
  if (!value || Number.isNaN(value)) return "-";
  return `${value} ر.س`;
}

export function PractitionerListCard({ practitioner }: PractitionerListCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { spacing, colors, shadows } = useAppTheme();

  return (
    <View
      style={{
        ...shadows.card,
        backgroundColor: colors.surfaceLowest,
        borderRadius: 36,
        gap: spacing.md,
        overflow: "hidden",
        padding: spacing.lg,
      }}
    >
      <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.md }}>
        <View style={{ position: "relative" }}>
          <Image
            source={{ uri: practitioner.avatarUrl || stitchAssets.practitionerFallback }}
            style={{ borderRadius: 18, height: 84, width: 84 }}
          />
          {practitioner.isOnlineNow ? (
            <View
              style={{
                backgroundColor: "rgba(197,236,204,0.95)",
                borderRadius: 999,
                bottom: -10,
                paddingHorizontal: 10,
                paddingVertical: 4,
                position: "absolute",
                right: 0,
              }}
            >
              <AppText variant="caption" style={{ fontWeight: "700" }}>
                متصل
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1, gap: spacing.xs }}>
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
            <AppText variant="title" style={{ flex: 1, fontSize: 26, fontWeight: "900" }}>
              {practitioner.displayName || "-"}
            </AppText>
            <View style={{ alignItems: "center", flexDirection: "row", gap: 2 }}>
              <AppText style={{ color: colors.primary, fontSize: 15 }}>★</AppText>
              <AppText variant="bodySmall" color={colors.primary} style={{ fontWeight: "700" }}>
                {practitioner.ratingSummary.averageRating ?? 0}
              </AppText>
            </View>
          </View>

          <AppText color={colors.secondary} style={{ fontWeight: "700" }}>
            {practitioner.professionalTitle || practitioner.practitionerType}
          </AppText>

          {practitioner.isVerified ? (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: "rgba(197,236,204,0.82)",
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <AppText variant="caption" style={{ fontWeight: "700" }}>
                موثق
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      {practitioner.bioSnippet ? (
        <AppText color={colors.textSecondary} style={{ lineHeight: 24 }}>
          {practitioner.bioSnippet}
        </AppText>
      ) : null}

      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ gap: 2 }}>
          <AppText variant="caption" color={colors.textMuted}>
            سعر الجلسة
          </AppText>
          <AppText color={colors.primary} style={{ fontWeight: "800" }}>
            {formatPrice(practitioner.sessionPrice30)}
          </AppText>
        </View>

        <Pressable
          onPress={() => router.push(routes.app.practitionerDetails(practitioner.slug))}
          style={{
            alignItems: "center",
            backgroundColor: "transparent",
            borderRadius: 999,
            flexDirection: "row",
            gap: 6,
            justifyContent: "center",
            minHeight: 48,
            paddingHorizontal: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 999,
              left: 0,
              opacity: 0.94,
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
            }}
          />
          <AppText color="#FFFFFF" style={{ fontWeight: "800" }}>
            {t("viewProfile")}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}
