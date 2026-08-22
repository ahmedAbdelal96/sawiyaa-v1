import React, { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Header, Screen, Text } from "../../src/components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useAppDirection } from "../../src/i18n/direction";
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
          key: "workEarnings",
          title: t("practitioner.more.sections.workEarnings"),
          subtitle: t("practitioner.more.workEarningsSubtitle"),
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
              key: "instantBookingPricing",
              title: t("practitioner.more.rows.instantBookingPricing.title"),
              subtitle: t("practitioner.more.rows.instantBookingPricing.subtitle"),
              icon: "flash-outline" as const,
              tone: "info" as PractitionerTone,
              onPress: () => router.push("/(mobile-tools)/instant-booking-pricing"),
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
          key: "account",
          title: t("practitioner.more.sections.account"),
          subtitle: t("practitioner.more.accountSubtitle"),
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
              key: "settings",
              title: t("settings.title"),
              subtitle: t("settings.subtitle"),
              icon: "settings-outline" as const,
              tone: "account" as PractitionerTone,
              onPress: () => router.push("/(settings)"),
            },
          ],
        },
        {
          key: "help",
          title: t("practitioner.more.sections.help"),
          subtitle: t("practitioner.more.helpSubtitle"),
          rows: [
            {
              key: "support",
              title: t("practitioner.more.rows.support.title"),
              subtitle: t("practitioner.more.rows.support.subtitle"),
              icon: "headset-outline" as const,
              tone: "support" as PractitionerTone,
              onPress: () => router.push("/(practitioner)/messages?tab=support"),
            },
          ],
        },
        {
          key: "accountAction",
          title: t("practitioner.more.sections.accountAction"),
          subtitle: t("practitioner.more.accountActionSubtitle"),
          rows: [
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
        <Text color={theme.colors.textSecondary} style={styles.subtitle}>
          {t("practitioner.more.subtitle")}
        </Text>

        {sections.map((section) => {
          return (
          <View
            key={section.key}
            style={styles.section}
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
          </View>
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
  const { chevronForward } = useAppDirection();
  const palette = resolvePractitionerTone(theme, tone);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        styles.row,
        {
          flexDirection: direction,
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
        name={chevronForward}
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
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 2,
  },
  section: {
    gap: 6,
    paddingTop: 4,
    paddingBottom: 4,
  },
  rows: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(105, 95, 80, 0.18)",
  },
  row: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(105, 95, 80, 0.18)",
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
