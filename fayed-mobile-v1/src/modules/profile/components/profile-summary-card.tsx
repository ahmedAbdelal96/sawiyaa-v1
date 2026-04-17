import { useTranslation } from "react-i18next";
import { Image, View } from "react-native";

import { stitchAssets } from "@/core/constants/stitch-assets";
import { useAppTheme } from "@/core/theme/theme-provider";
import type { PatientProfile } from "@/modules/profile/domain/profile.types";
import { AppText } from "@/shared/ui";

type ProfileSummaryCardProps = {
  profile: PatientProfile;
  identityEmail?: string | null;
};

function formatLocale(value: string | null) {
  if (!value) return "غير محددة";
  if (value.startsWith("ar")) return "العربية";
  if (value.startsWith("en")) return "English";
  return value;
}

function formatCountry(value: string | null) {
  if (!value) return "غير محددة";
  try {
    const display = new Intl.DisplayNames(["ar"], { type: "region" });
    return display.of(value) || value;
  } catch {
    return value;
  }
}

function formatTimezone(value: string | null) {
  if (!value) return "غير محددة";
  return value.replace(/_/g, " ");
}

function formatGender(value: string | null) {
  if (!value) return "غير مذكور";
  if (value === "MALE") return "ذكر";
  if (value === "FEMALE") return "أنثى";
  return "غير مذكور";
}

function formatDate(value: string | null, locale = "ar") {
  if (!value) return "غير مذكور";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير مذكور";

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function InfoItem({ label, value }: { label: string; value: string }) {
  const { colors, spacing } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: "rgba(242,244,246,0.92)",
        borderRadius: 20,
        gap: spacing.xs,
        minHeight: 94,
        padding: spacing.md,
      }}
    >
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText style={{ fontWeight: "800" }}>{value}</AppText>
    </View>
  );
}

export function ProfileSummaryCard({ profile, identityEmail }: ProfileSummaryCardProps) {
  const { t, i18n } = useTranslation();
  const { spacing, colors, shadows } = useAppTheme();

  const resolvedDisplayName = profile.displayName || "ضيف فايِد";
  const resolvedEmail = identityEmail || "غير مضاف";
  const progressLabel = profile.isOnboardingCompleted ? t("statusCompleted") : t("statusPending");

  return (
    <View style={{ gap: spacing.lg }}>
      <View
        style={{
          ...shadows.card,
          backgroundColor: colors.surfaceLowest,
          borderRadius: 40,
          gap: spacing.md,
          padding: spacing.lg,
        }}
      >
        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <Image source={{ uri: stitchAssets.journeyAvatar }} style={{ borderRadius: 46, height: 92, width: 92 }} />
          <View style={{ alignItems: "center", gap: 4 }}>
            <AppText variant="heading" style={{ fontSize: 34, fontWeight: "900" }}>
              {resolvedDisplayName}
            </AppText>
            <AppText color={colors.textSecondary}>{resolvedEmail}</AppText>
          </View>
          <View
            style={{
              backgroundColor: profile.isOnboardingCompleted ? "rgba(197,236,204,0.9)" : "rgba(255,218,214,0.8)",
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 5,
            }}
          >
            <AppText variant="caption" style={{ fontWeight: "700" }}>
              {progressLabel}
            </AppText>
          </View>
        </View>

        <View style={{ backgroundColor: "rgba(194,198,211,0.3)", height: 1 }} />

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <InfoItem label="اللغة المفضلة" value={formatLocale(profile.locale)} />
          </View>
          <View style={{ flex: 1 }}>
            <InfoItem label="الدولة" value={formatCountry(profile.countryCode)} />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <InfoItem label="المنطقة الزمنية" value={formatTimezone(profile.timezone)} />
          </View>
          <View style={{ flex: 1 }}>
            <InfoItem label="النوع" value={formatGender(profile.gender)} />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <InfoItem label="تاريخ الميلاد" value={formatDate(profile.dateOfBirth, i18n.language)} />
          </View>
          <View style={{ flex: 1 }}>
            <InfoItem label="آخر تحديث" value={formatDate(profile.updatedAt, i18n.language)} />
          </View>
        </View>
      </View>

      <View
        style={{
          backgroundColor: "rgba(213,227,255,0.45)",
          borderRadius: 32,
          padding: spacing.lg,
        }}
      >
        <AppText color={colors.textSecondary} style={{ lineHeight: 24 }}>
          هذا الملف يساعدك على متابعة رحلتك بسهولة. يمكنك تحديث بياناتك لاحقًا مع توسّع الميزات داخل التطبيق.
        </AppText>
      </View>
    </View>
  );
}
