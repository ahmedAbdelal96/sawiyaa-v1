import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { useAuthSession } from "@/auth/hooks/use-auth-session";
import { AppError } from "@/core/errors/app-error";
import { useAppTheme } from "@/core/theme/theme-provider";
import { ProfileSummaryCard } from "@/modules/profile/components/profile-summary-card";
import { useProfile } from "@/modules/profile/hooks/use-profile";
import { AppEmptyState, AppErrorState, AppLoader, AppScreen, AppText } from "@/shared/ui";

export function ProfileScreen() {
  const { t } = useTranslation();
  const { spacing, colors } = useAppTheme();
  const { user } = useAuthSession();
  const profileQuery = useProfile();

  if (profileQuery.isLoading) {
    return (
      <AppScreen>
        <AppLoader label={t("loading")} />
      </AppScreen>
    );
  }

  if (profileQuery.isError) {
    const error = profileQuery.error;

    if (error instanceof AppError && error.status === 404) {
      return (
        <AppScreen>
          <View style={{ gap: spacing.md }}>
            <AppText variant="heading" style={{ fontWeight: "900" }}>
              {t("profileTitle")}
            </AppText>
            <AppText color={colors.textSecondary}>{t("profileSubtitle")}</AppText>
            <AppEmptyState title={t("profileNotFoundTitle")} description={t("profileNotFoundDescription")} />
          </View>
        </AppScreen>
      );
    }

    return (
      <AppScreen>
        <View style={{ gap: spacing.md }}>
          <AppText variant="heading" style={{ fontWeight: "900" }}>
            {t("profileTitle")}
          </AppText>
          <AppText color={colors.textSecondary}>{t("profileSubtitle")}</AppText>
          <AppErrorState onRetry={() => profileQuery.refetch()} />
        </View>
      </AppScreen>
    );
  }

  if (!profileQuery.data) {
    return (
      <AppScreen>
        <View style={{ gap: spacing.md }}>
          <AppText variant="heading" style={{ fontWeight: "900" }}>
            {t("profileTitle")}
          </AppText>
          <AppText color={colors.textSecondary}>{t("profileSubtitle")}</AppText>
          <AppEmptyState title={t("profileNotFoundTitle")} description={t("profileNotFoundDescription")} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <View
          style={{
            backgroundColor: "rgba(248,249,251,0.82)",
            borderRadius: 999,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.sm,
          }}
        >
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
            <AppText color={colors.primary}>←</AppText>
            <AppText variant="title" style={{ fontWeight: "900" }} color={colors.primary}>
              Fayed
            </AppText>
          </View>
          <View
            style={{
              backgroundColor: "rgba(213,227,255,0.65)",
              borderRadius: 999,
              height: 40,
              width: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText>🙂</AppText>
          </View>
        </View>

        <View style={{ gap: spacing.xs }}>
          <AppText variant="heading" style={{ fontWeight: "900" }}>
            {t("profileTitle")}
          </AppText>
          <AppText color={colors.textSecondary}>
            مساحة واضحة لهويتك وتفاصيلك الأساسية داخل رحلتك الحالية.
          </AppText>
        </View>

        <ProfileSummaryCard profile={profileQuery.data} identityEmail={user?.primaryEmail || null} />
      </View>
    </AppScreen>
  );
}
