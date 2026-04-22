import React from "react";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { I18nManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
          height: 66 + insets.bottom,
          paddingBottom: Math.max(10, insets.bottom),
          paddingTop: 8,
          paddingHorizontal: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 3,
          borderRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
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
      <Tabs.Screen name="sessions/[id]" options={{ href: null }} />
    </Tabs>
  );
}
