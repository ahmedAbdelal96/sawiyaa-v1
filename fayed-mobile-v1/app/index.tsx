import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { useAuthSession } from "@/auth/hooks/use-auth-session";
import { useAppTheme } from "@/core/theme/theme-provider";
import { AppButton, AppScreen, AppText } from "@/shared/ui";

export default function IndexRoute() {
  const router = useRouter();
  const { status } = useAuthSession();
  const { spacing, colors } = useAppTheme();

  return (
    <AppScreen contentStyle={{ justifyContent: "center", paddingTop: spacing.xxxl }}>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View
          pointerEvents="none"
          style={{
            backgroundColor: "rgba(213,227,255,0.55)",
            borderRadius: 999,
            height: 300,
            position: "absolute",
            right: -120,
            top: -90,
            width: 300,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            backgroundColor: "rgba(197,236,204,0.5)",
            borderRadius: 999,
            bottom: -120,
            height: 250,
            left: -90,
            position: "absolute",
            width: 250,
          }}
        />

        <View style={{ gap: spacing.xxxl }}>
          <View style={{ alignItems: "center", gap: spacing.xl }}>
            <View
              style={{
                alignItems: "center",
                backgroundColor: "#FFFFFF",
                borderRadius: 34,
                height: 150,
                justifyContent: "center",
                overflow: "hidden",
                width: 150,
              }}
            >
              <LinearGradient
                colors={["rgba(11,92,172,0.18)", "rgba(53,117,199,0.04)"]}
                style={{
                  alignItems: "center",
                  borderRadius: 26,
                  height: 110,
                  justifyContent: "center",
                  width: 110,
                }}
              >
                <View style={{ backgroundColor: colors.primary, borderRadius: 10, height: 10, transform: [{ rotate: "-34deg" }], width: 62 }} />
                <View
                  style={{
                    backgroundColor: "rgba(11,92,172,0.35)",
                    borderRadius: 8,
                    height: 8,
                    marginTop: 9,
                    transform: [{ rotate: "-34deg" }],
                    width: 40,
                  }}
                />
              </LinearGradient>
            </View>

            <View style={{ alignItems: "center", gap: spacing.sm }}>
              <AppText variant="display" align="center" style={{ fontWeight: "900" }}>
                Fayed فايد
              </AppText>
              <AppText align="center" color={colors.textSecondary} style={{ fontSize: 24 }}>
                خطوتك الأولى نحو العافية
              </AppText>
            </View>
          </View>

          <View style={{ gap: spacing.md }}>
            <AppButton
              label="ابدأ رحلتك"
              onPress={() => router.replace(status === "authenticated" ? "/home" : "/welcome")}
            />

            <Pressable onPress={() => router.replace(status === "authenticated" ? "/home" : "/welcome")}
              style={{ paddingVertical: spacing.xs }}>
              <AppText align="center" variant="caption" color={colors.textMuted}>
                SUPPORTED BY PERSONALIZED GUIDANCE
              </AppText>
            </Pressable>
          </View>

          <View style={{ alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center" }}>
            <View style={{ backgroundColor: colors.primary, borderRadius: 6, height: 4, width: 32 }} />
            <View style={{ backgroundColor: "rgba(114,119,131,0.35)", borderRadius: 6, height: 4, width: 10 }} />
            <View style={{ backgroundColor: "rgba(114,119,131,0.35)", borderRadius: 6, height: 4, width: 10 }} />
          </View>
        </View>
      </View>
    </AppScreen>
  );
}
