import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image, Pressable, View } from "react-native";

import { routes } from "@/core/constants/routes";
import { stitchAssets } from "@/core/constants/stitch-assets";
import { useAppTheme } from "@/core/theme/theme-provider";
import { AppButton, AppScreen, AppText } from "@/shared/ui";

export function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { spacing, colors } = useAppTheme();

  return (
    <AppScreen scroll contentStyle={{ paddingTop: spacing.md }}>
      <View style={{ gap: spacing.xl }}>
        <View
          style={{
            backgroundColor: "rgba(248,249,251,0.82)",
            borderRadius: 999,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <AppText color={colors.primary} variant="title" style={{ fontWeight: "900" }}>
            Fayed
          </AppText>
          <AppText color={colors.primary} variant="caption">
            اللغة
          </AppText>
        </View>

        <View style={{ alignItems: "center", gap: spacing.lg }}>
          <View style={{ borderRadius: 32, overflow: "hidden", width: "100%" }}>
            <Image source={{ uri: stitchAssets.welcomeHero }} style={{ aspectRatio: 1.02, width: "100%" }} />
          </View>

          <View style={{ gap: spacing.sm }}>
            <AppText variant="display" align="center" style={{ fontSize: 44, fontWeight: "900", lineHeight: 56 }}>
              رحلتك نحو العافية تبدأ من هنا
            </AppText>
            <AppText align="center" color={colors.textSecondary} style={{ lineHeight: 30 }}>
              نحن هنا لنرشدك إلى المختص الأنسب لك بخطوات هادئة وواضحة.
            </AppText>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppButton label={t("welcomePrimaryCta")} onPress={() => router.push(routes.public.login)} />
          <AppButton
            label={t("welcomeSecondaryCta")}
            onPress={() => router.push(routes.public.register)}
            variant="secondary"
            style={{ borderWidth: 2, borderColor: "rgba(194,198,211,0.3)" }}
          />
        </View>

        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
          <View style={{ backgroundColor: "rgba(194,198,211,0.35)", flex: 1, height: 1 }} />
          <AppText variant="caption" color={colors.textMuted}>
            أو
          </AppText>
          <View style={{ backgroundColor: "rgba(194,198,211,0.35)", flex: 1, height: 1 }} />
        </View>

        <Pressable
          style={{
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderColor: "rgba(194,198,211,0.2)",
            borderRadius: 999,
            borderWidth: 1,
            justifyContent: "center",
            minHeight: 64,
          }}
        >
          <AppText align="center" style={{ fontWeight: "700" }}>
            المتابعة باستخدام Google
          </AppText>
        </Pressable>

        <AppText align="center" variant="caption" color={colors.textMuted} style={{ lineHeight: 22 }}>
          بالاستمرار، أنت توافق على شروط الخدمة وسياسة الخصوصية
        </AppText>
      </View>
    </AppScreen>
  );
}
