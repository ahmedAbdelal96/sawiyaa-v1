import React, { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Header, Screen, Text } from "../../src/components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useAppDirection } from "../../src/i18n/direction";

type RowItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  isDanger?: boolean;
  onPress: () => void;
};

export default function PractitionerMoreScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { signOut } = useAuth();
  const { isRtl, chevronForward } = useAppDirection();

  const sections = useMemo(
    () =>
      [
        {
          key: "workEarnings",
          title: t("practitioner.more.sections.workEarnings"),
          rows: [
            {
              key: "finance",
              title: t("practitioner.more.rows.finance.title"),
              subtitle: t("practitioner.more.rows.finance.subtitle"),
              icon: "wallet-outline" as const,
              iconBg: "#DCFCE7",
              iconColor: "#16A34A",
              onPress: () => router.push("/(practitioner)/finance"),
            },
            {
              key: "instantBookingPricing",
              title: t("practitioner.more.rows.instantBookingPricing.title"),
              subtitle: t("practitioner.more.rows.instantBookingPricing.subtitle"),
              icon: "flash-outline" as const,
              iconBg: "#FEF3C7",
              iconColor: "#D97706",
              onPress: () => router.push("/(mobile-tools)/instant-booking-pricing"),
            },
            {
              key: "promoCodes",
              title: t("practitioner.more.rows.promoCodes.title"),
              subtitle: t("practitioner.more.rows.promoCodes.subtitle"),
              icon: "pricetag-outline" as const,
              iconBg: "#F3E8FF",
              iconColor: "#9333EA",
              onPress: () => router.push("/(practitioner)/promo-codes"),
            },
          ],
        },
        {
          key: "account",
          title: t("practitioner.more.sections.account"),
          rows: [
            {
              key: "account",
              title: t("practitioner.more.rows.account.title"),
              subtitle: t("practitioner.more.rows.account.subtitle"),
              icon: "person-outline" as const,
              iconBg: theme.colors.primaryLight,
              iconColor: theme.colors.primary,
              onPress: () => router.push("/(practitioner)/account"),
            },
            {
              key: "settings",
              title: t("settings.title"),
              subtitle: t("settings.subtitle"),
              icon: "settings-outline" as const,
              iconBg: "#F1F5F9",
              iconColor: "#475569",
              onPress: () => router.push("/(settings)"),
            },
          ],
        },
        {
          key: "help",
          title: t("practitioner.more.sections.help"),
          rows: [
            {
              key: "support",
              title: t("practitioner.more.rows.support.title"),
              subtitle: t("practitioner.more.rows.support.subtitle"),
              icon: "headset-outline" as const,
              iconBg: "#E0F2FE",
              iconColor: "#0284C7",
              onPress: () => router.push("/(practitioner)/messages?tab=support"),
            },
          ],
        },
        {
          key: "accountAction",
          title: t("practitioner.more.sections.accountAction"),
          rows: [
            {
              key: "logout",
              title: t("practitioner.more.rows.logout.title"),
              subtitle: t("practitioner.more.rows.logout.subtitle"),
              icon: "log-out-outline" as const,
              iconBg: "#FFE4E6",
              iconColor: "#E11D48",
              isDanger: true,
              onPress: () => void signOut(),
            },
          ],
        },
      ],
    [router, signOut, t, theme.colors.primary, theme.colors.primaryLight],
  );

  return (
    <Screen bg="background">
      <Header title={t("practitioner.more.title")} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map((section) => {
          return (
            <View key={section.key} style={styles.section}>
              <Text
                weight="700"
                style={[
                  styles.sectionHeaderTitle,
                  { textAlign: isRtl ? "right" : "left", color: theme.colors.textSecondary },
                ]}
              >
                {section.title}
              </Text>

              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderLight,
                  },
                ]}
              >
                {section.rows.map((row, index) => (
                  <MoreRowItem
                    key={row.key}
                    row={row}
                    isRtl={isRtl}
                    chevron={chevronForward}
                    isLast={index === section.rows.length - 1}
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

function MoreRowItem({
  row,
  isRtl,
  chevron,
  isLast,
}: {
  row: RowItem;
  isRtl: boolean;
  chevron: keyof typeof Ionicons.glyphMap;
  isLast: boolean;
}) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={row.onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={row.title}
      style={[
        styles.row,
        {
          flexDirection: isRtl ? "row-reverse" : "row",
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.borderLight,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: row.iconBg }]}>
        <Ionicons name={row.icon} size={19} color={row.iconColor} />
      </View>

      <View style={styles.rowText}>
        <Text
          weight="700"
          style={[
            styles.rowTitle,
            {
              textAlign: isRtl ? "right" : "left",
              color: row.isDanger ? "#E11D48" : theme.colors.textPrimary,
            },
          ]}
        >
          {row.title}
        </Text>
        <Text
          color={theme.colors.textMuted}
          style={[styles.rowSubtitle, { textAlign: isRtl ? "right" : "left" }]}
          numberOfLines={1}
        >
          {row.subtitle}
        </Text>
      </View>

      <Ionicons name={chevron} size={16} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 16,
  },
  section: {
    gap: 7,
  },
  sectionHeaderTitle: {
    fontSize: 12.5,
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  rowSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
});
