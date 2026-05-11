import React from "react";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { I18nManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/providers/AuthProvider";
import { usePractitionerPresenceHeartbeat } from "../../src/features/practitioner/presence/hooks";
import { useTheme } from "../../src/providers/ThemeProvider";

const TabIcon = ({
  name,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
}) => <Ionicons name={name} size={24} color={color} />;

export default function PractitionerLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isRTL = I18nManager.isRTL;
  const { role, isLoading } = useAuth();

  usePractitionerPresenceHeartbeat(!isLoading && role === "practitioner");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.borderLight,
          borderTopWidth: 1,
          elevation: 16,
          shadowColor: "#0f172a",
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -2 },
          height: 74 + insets.bottom,
          paddingBottom: Math.max(12, insets.bottom),
          paddingTop: 12,
          paddingHorizontal: 18,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          borderRadius: 16,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("practitioner.tab.dashboard"),
          tabBarIcon: ({ color }) => (
            <TabIcon name="grid-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sessions/index"
        options={{
          title: t("practitioner.tab.sessions"),
          tabBarIcon: ({ color }) => (
            <TabIcon name="calendar-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="availability/index"
        options={{
          title: t("practitioner.tab.availability"),
          tabBarIcon: ({ color }) => (
            <TabIcon
              name={isRTL ? "time-outline" : "pulse-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="support/index" options={{ href: null }} />
      <Tabs.Screen name="support/[id]" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="messages/index" options={{ href: null }} />
      <Tabs.Screen name="messages/[id]" options={{ href: null }} />
      <Tabs.Screen name="care-chat/index" options={{ href: null }} />
      <Tabs.Screen name="care-chat/request/[id]" options={{ href: null }} />
      <Tabs.Screen name="care-chat/[id]" options={{ href: null }} />
      <Tabs.Screen name="finance/index" options={{ href: null }} />
      <Tabs.Screen name="finance/wallet" options={{ href: null }} />
      <Tabs.Screen name="finance/ledger" options={{ href: null }} />
      <Tabs.Screen name="finance/settlements" options={{ href: null }} />
      <Tabs.Screen name="sessions/[id]" options={{ href: null }} />
    </Tabs>
  );
}
