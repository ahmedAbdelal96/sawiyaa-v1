import React from "react";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../src/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MOBILE_TAB_BAR_HEIGHT,
  MOBILE_TAB_ICON_SIZE,
} from "../../src/components/mobile-shell";

export default function PatientLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarActiveBackgroundColor: theme.colors.primaryLight,
        tabBarInactiveBackgroundColor: theme.colors.surface,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.borderLight,
          borderTopWidth: 1,
          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.04,
          shadowRadius: 14,
          height: MOBILE_TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: Math.max(10, insets.bottom),
          paddingTop: 10,
          paddingHorizontal: 12,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          borderRadius: 16,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("home.tabLabel"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={MOBILE_TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: t("home.sessionsTab"),
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="calendar-outline"
              size={MOBILE_TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t("home.notificationsTab"),
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="notifications-outline"
              size={MOBILE_TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("home.moreTab"),
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="menu-outline"
              size={MOBILE_TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      {/* Hidden stack routes */}
      <Tabs.Screen name="discovery/index" options={{ href: null }} />
      <Tabs.Screen name="discovery/filters" options={{ href: null }} />
      <Tabs.Screen name="discovery/[slug]" options={{ href: null }} />
      <Tabs.Screen name="assessments/index" options={{ href: null }} />
      <Tabs.Screen name="assessments/[slug]" options={{ href: null }} />
      <Tabs.Screen name="assessments/[slug]/questions" options={{ href: null }} />
      <Tabs.Screen name="assessments/submissions/[submissionId]" options={{ href: null }} />
      <Tabs.Screen name="articles/index" options={{ href: null }} />
      <Tabs.Screen name="articles/[slug]" options={{ href: null }} />
      <Tabs.Screen name="academy/index" options={{ href: null }} />
      <Tabs.Screen name="academy/[slug]" options={{ href: null }} />
      <Tabs.Screen name="academy/enrollments/[id]" options={{ href: null }} />
      <Tabs.Screen name="package-purchases/index" options={{ href: null }} />
      <Tabs.Screen name="package-purchases/[id]" options={{ href: null }} />
      <Tabs.Screen name="package-purchases/create" options={{ href: null }} />
      <Tabs.Screen name="package-purchases/[id]/pay" options={{ href: null }} />
      <Tabs.Screen name="sessions/select-time" options={{ href: null }} />
      <Tabs.Screen name="sessions/confirm" options={{ href: null }} />
      <Tabs.Screen name="sessions/success" options={{ href: null }} />
      <Tabs.Screen name="sessions/[id]" options={{ href: null }} />
      <Tabs.Screen name="sessions/[id]/pay" options={{ href: null }} />
      <Tabs.Screen name="sessions/[id]/payment-return" options={{ href: null }} />
      <Tabs.Screen name="sessions/[id]/cancel-preview" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="payments/transactions" options={{ href: null }} />
      <Tabs.Screen name="matching/intro" options={{ href: null }} />
      <Tabs.Screen name="matching/questions" options={{ href: null }} />
      <Tabs.Screen name="matching/results" options={{ href: null }} />
      <Tabs.Screen name="support/index" options={{ href: null }} />
      <Tabs.Screen name="support/new" options={{ href: null }} />
      <Tabs.Screen name="support/[id]" options={{ href: null }} />
      <Tabs.Screen name="messages/index" options={{ href: null }} />
      <Tabs.Screen name="messages/[id]" options={{ href: null }} />
      <Tabs.Screen name="profile-details" options={{ href: null }} />
      <Tabs.Screen name="profile-details/edit" options={{ href: null }} />
      <Tabs.Screen name="profile-preferences" options={{ href: null }} />
      <Tabs.Screen name="profile-notifications" options={{ href: null }} />
      <Tabs.Screen name="care-chat/index" options={{ href: null }} />
      <Tabs.Screen name="care-chat/new" options={{ href: null }} />
      <Tabs.Screen name="care-chat/[id]" options={{ href: null }} />
      <Tabs.Screen name="care-chat/request/[id]" options={{ href: null }} />
    </Tabs>
  );
}
