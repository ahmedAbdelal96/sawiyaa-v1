import React, { useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Card, Text } from "../../components/ui";
import { useTheme } from "../../providers/ThemeProvider";
import { useAppDirection } from "../../i18n/direction";
import { useMyNextSession } from "./next-session";

export function UpcomingSessionCard() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { isRtl, rowDirection } = useAppDirection();
  const router = useRouter();
  const query = useMyNextSession();
  const [now, setNow] = useState(Date.now());
  const session = query.data;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!session) return null;
  const target = session.joinAvailableAt ?? session.startsAt;
  const minutes = Math.max(0, Math.ceil((new Date(target).getTime() - now) / 60_000));
  const time = new Intl.DateTimeFormat(i18n.language?.startsWith("ar") ? "ar-EG" : "en-US", {
    dateStyle: "medium", timeStyle: "short", timeZone: session.displayTimezone,
  }).format(new Date(session.startsAt));

  return (
    <Card variant="elevated" padding="lg" style={{ marginBottom: 20, backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.primary, borderWidth: 1 }}>
      <View style={{ flexDirection: rowDirection, justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text variant="bodySmall" color={theme.colors.primary} weight="700" style={{ textAlign: isRtl ? "right" : "left" }}>
            {t("home.nextSession.title", isRtl ? "الجلسة القادمة" : "Upcoming session")}
          </Text>
          <Text variant="h2" weight="700" style={{ marginTop: 4, textAlign: isRtl ? "right" : "left" }}>
            {session.counterpart.displayName ?? t("profileScreen.fallbackName")}
          </Text>
          <Text variant="bodySmall" color={theme.colors.textSecondary} style={{ marginTop: 6, textAlign: isRtl ? "right" : "left" }}>
            {time} · {session.displayTimezone}
          </Text>
          <Text variant="bodySmall" color={theme.colors.primary} weight="700" style={{ marginTop: 6, textAlign: isRtl ? "right" : "left" }}>
            {session.joinAvailable ? t("home.nextSession.joinNow", isRtl ? "الدخول متاح الآن" : "Join is available now") : `${t("home.nextSession.startsIn", isRtl ? "تبدأ بعد" : "Starts in")} ${minutes}m`}
          </Text>
        </View>
        <Ionicons name="videocam-outline" size={24} color={theme.colors.primary} />
      </View>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push((session.joinAvailable ? session.joinRoute : session.detailsRoute) as any)}
        style={{ marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
      >
        <Text color={theme.colors.onPrimary} weight="700">{session.joinAvailable ? t("home.nextSession.join", isRtl ? "دخول الجلسة" : "Join session") : t("home.nextSession.details", isRtl ? "تفاصيل الجلسة" : "View details")}</Text>
      </TouchableOpacity>
    </Card>
  );
}
