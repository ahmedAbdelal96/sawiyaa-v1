import React from "react";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/providers/AuthProvider";
import { usePractitionerPresenceHeartbeat } from "../../src/features/practitioner/presence/hooks";
import { useTheme } from "../../src/providers/ThemeProvider";
import {
  MOBILE_TAB_BAR_HEIGHT,
  MOBILE_TAB_ICON_SIZE,
} from "../../src/components/mobile-shell";

const TabIcon = ({
  name,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
}) => <Ionicons name={name} size={MOBILE_TAB_ICON_SIZE} color={color} />;

export default function PractitionerLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { role, user, isLoading } = useAuth();
  const isApprovedPractitioner = user?.practitionerStatus === "APPROVED";

  usePractitionerPresenceHeartbeat(
    !isLoading && role === "practitioner" && isApprovedPractitioner,
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarActiveBackgroundColor: theme.colors.primarySoft,
        tabBarInactiveBackgroundColor: theme.colors.surfaceRaised,
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceRaised,
          borderTopColor: theme.colors.borderStrong,
          borderTopWidth: 1,
          ...theme.shadows.sm,
          shadowColor: theme.colors.shadow,
          height: MOBILE_TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: Math.max(insets.bottom, theme.spacing.sm),
          paddingTop: theme.spacing.sm,
          paddingHorizontal: theme.spacing.sm,
        },
        tabBarItemStyle: {
          minHeight: theme.touchTargets.md,
          paddingVertical: 6,
          paddingHorizontal: 8,
          borderRadius: theme.radius.md,
          marginHorizontal: 2,
        },
        tabBarLabelStyle: {
          fontSize: theme.typography.tabLabel.fontSize,
          lineHeight: theme.typography.tabLabel.lineHeight,
          fontWeight: theme.typography.tabLabel.fontWeight,
        },
        tabBarIconStyle: {
          marginBottom: -1,
        },
        tabBarBadgeStyle: {
          backgroundColor: theme.colors.error,
        },
      }}
    >
      {/* Primary tabs */}
      <Tabs.Screen
        name="index"
        options={{
          href: isApprovedPractitioner ? undefined : null,
          title: t("practitioner.tab.dashboard"),
          tabBarIcon: ({ color }) => (
            <TabIcon name="grid-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sessions/index"
        options={{
          href: isApprovedPractitioner ? undefined : null,
          title: t("practitioner.tab.sessions"),
          tabBarIcon: ({ color }) => (
            <TabIcon name="calendar-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="availability/index"
        options={{
          href: isApprovedPractitioner ? undefined : null,
          title: t("practitioner.tab.availability"),
          tabBarIcon: ({ color }) => (
            <TabIcon name="time-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          href: isApprovedPractitioner ? undefined : null,
          title: t("practitioner.tab.more"),
          tabBarIcon: ({ color }) => (
            <TabIcon name="menu-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="application-status"
        options={{
          href: isApprovedPractitioner ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="support/index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="support/new"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="support/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="account"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="onboarding"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="messages/[id]"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="care-chat/index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="care-chat/request/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="care-chat/[id]"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="finance/index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="finance/wallet"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="finance/ledger"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="finance/settlements"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="promo-codes"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="sessions/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="instant-booking"
        options={{ href: null }}
      />
    </Tabs>
  );
}
