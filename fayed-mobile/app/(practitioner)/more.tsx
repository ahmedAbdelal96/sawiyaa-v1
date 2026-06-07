import React, { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Card, Header, Screen, Text } from "../../src/components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import {
  CompactSectionHeader,
  resolvePractitionerTone,
  type PractitionerTone,
} from "../../src/features/practitioner/ui/compact";

export default function PractitionerMoreScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { signOut } = useAuth();

  const isArabic = i18n.language?.startsWith("ar");
  const rowDirection = isArabic ? "row-reverse" : "row";

  const sections = useMemo(
    () =>
      [
        {
          key: "daily",
          title: t("practitioner.more.sections.daily"),
          subtitle: t("practitioner.more.dailySubtitle"),
          tone: "daily" as PractitionerTone,
          rows: [
            {
              key: "sessions",
              title: t("practitioner.more.rows.sessions.title"),
              subtitle: t("practitioner.more.rows.sessions.subtitle"),
              icon: "calendar-outline" as const,
              tone: "daily" as PractitionerTone,
              onPress: () => router.push("/(practitioner)/sessions"),
            },
            {
              key: "messages",
              title: t("practitioner.more.rows.messages.title"),
              subtitle: t("practitioner.more.rows.messages.subtitle"),
              icon: "chatbubbles-outline" as const,
              tone: "messages" as PractitionerTone,
              onPress: () => router.push("/(practitioner)/messages"),
            },
            {
              key: "availability",
              title: t("practitioner.more.rows.availability.title"),
              subtitle: t("practitioner.more.rows.availability.subtitle"),
              icon: "pulse-outline" as const,
              tone: "info" as PractitionerTone,
              onPress: () => router.push("/(practitioner)/availability"),
            },
          ],
        },
        {
          key: "workTools",
          title: t("practitioner.more.sections.workTools"),
          subtitle: t("practitioner.more.workToolsSubtitle"),
          tone: "info" as PractitionerTone,
          rows: [
            {
              key: "notifications",
              title: t("practitioner.more.rows.notifications.title"),
              subtitle: t("practitioner.more.rows.notifications.subtitle"),
              icon: "notifications-outline" as const,
              tone: "warning" as PractitionerTone,
              onPress: () => router.push("/(practitioner)/notifications"),
            },
          ],
        },
        {
          key: "finance",
          title: t("practitioner.more.sections.finance"),
          subtitle: t("practitioner.more.financeSubtitle"),
          tone: "finance" as PractitionerTone,
          rows: [
            {
              key: "finance",
              title: t("practitioner.more.rows.finance.title"),
              subtitle: t("practitioner.more.rows.finance.subtitle"),
              icon: "cash-outline" as const,
              tone: "finance" as PractitionerTone,
              onPress: () => router.push("/(practitioner)/finance"),
            },
            {
              key: "wallet",
              title: t("practitioner.more.rows.wallet.title"),
              subtitle: t("practitioner.more.rows.wallet.subtitle"),
              icon: "wallet-outline" as const,
              tone: "finance" as PractitionerTone,
              onPress: () => router.push("/(practitioner)/finance/wallet"),
            },
            {
              key: "ledger",
              title: t("practitioner.more.rows.ledger.title"),
              subtitle: t("practitioner.more.rows.ledger.subtitle"),
              icon: "receipt-outline" as const,
              tone: "info" as PractitionerTone,
              onPress: () => router.push("/(practitioner)/finance/ledger"),
            },
            {
              key: "settlements",
              title: t("practitioner.more.rows.settlements.title"),
              subtitle: t("practitioner.more.rows.settlements.subtitle"),
              icon: "layers-outline" as const,
              tone: "warning" as PractitionerTone,
              onPress: () => router.push("/(practitioner)/finance/settlements"),
            },
            {
              key: "promoCodes",
              title: t("practitioner.more.rows.promoCodes.title"),
              subtitle: t("practitioner.more.rows.promoCodes.subtitle"),
              icon: "pricetag-outline" as const,
              tone: "neutral" as PractitionerTone,
              onPress: () => router.push("/(practitioner)/promo-codes"),
            },
          ],
        },
        {
          key: "accountSupport",
          title: t("practitioner.more.sections.accountSupport"),
          subtitle: t("practitioner.more.accountSupportSubtitle"),
          tone: "support" as PractitionerTone,
          rows: [
            {
              key: "account",
              title: t("practitioner.more.rows.account.title"),
              subtitle: t("practitioner.more.rows.account.subtitle"),
              icon: "person-outline" as const,
              tone: "account" as PractitionerTone,
              onPress: () => router.push("/(practitioner)/account"),
            },
            {
              key: "support",
              title: t("practitioner.more.rows.support.title"),
              subtitle: t("practitioner.more.rows.support.subtitle"),
              icon: "headset-outline" as const,
              tone: "support" as PractitionerTone,
              onPress: () => router.push("/(practitioner)/messages?tab=support"),
            },
            {
              key: "logout",
              title: t("practitioner.more.rows.logout.title"),
              subtitle: t("practitioner.more.rows.logout.subtitle"),
              icon: "log-out-outline" as const,
              tone: "danger" as PractitionerTone,
              onPress: () => void signOut(),
            },
          ],
        },
      ] as const,
    [router, signOut, t],
  );

  return (
    <Screen bg="background">
      <Header title={t("practitioner.more.title")} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card variant="outlined" padding="sm" style={styles.introCard}>
          <View style={styles.introHeader}>
            <View style={styles.introCopy}>
              <Text weight="700" style={styles.introTitle} color={theme.colors.textPrimary}>
                {t("practitioner.more.title")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.introSubtitle}>
                {t("practitioner.more.subtitle")}
              </Text>
            </View>
            <View style={[styles.introPill, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="grid-outline" size={14} color={theme.colors.primary} />
              <Text weight="600" style={styles.introPillText} color={theme.colors.primary}>
                {t("practitioner.tab.more")}
              </Text>
            </View>
          </View>
        </Card>

        {sections.map((section) => {
          return (
          <Card
            key={section.key}
            variant="outlined"
            padding="sm"
            style={[
              styles.sectionCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderLight,
              },
            ]}
          >
            <CompactSectionHeader
              title={section.title}
              subtitle={section.subtitle}
            />
            <View style={styles.rows}>
              {section.rows.map((row) => (
                <MoreRow
                  key={row.key}
                  title={row.title}
                  subtitle={row.subtitle}
                  icon={row.icon}
                  tone={row.tone}
                  direction={rowDirection}
                  onPress={row.onPress}
                />
              ))}
            </View>
          </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function MoreRow({
  title,
  subtitle,
  icon,
  tone = "neutral",
  direction,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: PractitionerTone;
  direction: "row" | "row-reverse";
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const palette = resolvePractitionerTone(theme, tone);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        styles.row,
        {
          flexDirection: direction,
          borderColor: palette.border,
          backgroundColor: palette.surface,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: palette.iconBackground },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={palette.iconColor}
        />
      </View>

      <View style={styles.rowText}>
      <Text
          weight="600"
          style={[styles.rowTitle, { textAlign: direction === "row-reverse" ? "right" : "left" }]}
          color={theme.colors.textPrimary}
        >
          {title}
        </Text>
        <Text
          color={theme.colors.textSecondary}
          style={[styles.rowSubtitle, { textAlign: direction === "row-reverse" ? "right" : "left" }]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name={direction === "row-reverse" ? "chevron-back" : "chevron-forward"}
        size={16}
        color={theme.colors.textMuted}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10,
  },
  introCard: {
    gap: 0,
  },
  introHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  introCopy: {
    flex: 1,
    gap: 2,
  },
  introTitle: {
    fontSize: 16,
    lineHeight: 21,
  },
  introSubtitle: {
    fontSize: 11,
    lineHeight: 16,
  },
  introPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  introPillText: {
    fontSize: 11,
  },
  sectionCard: {
    gap: 8,
  },
  rows: {
    gap: 6,
  },
  row: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 14,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  rowSubtitle: {
    fontSize: 10,
    lineHeight: 14,
  },
});
