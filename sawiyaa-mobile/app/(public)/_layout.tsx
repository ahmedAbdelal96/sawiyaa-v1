import React from "react";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, I18nManager } from "react-native";
import { useTheme } from "../../src/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MOBILE_TAB_BAR_HEIGHT,
  MOBILE_TAB_ICON_SIZE,
} from "../../src/components/mobile-shell";

export default function PublicLayout() {
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
        tabBarActiveBackgroundColor: theme.colors.primarySoft,
        tabBarInactiveBackgroundColor: theme.colors.surfaceRaised,
        tabBarStyle: {
          display: "none",
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("publicTabs.home"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={MOBILE_TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="practitioners"
        options={{
          href: null,
          title: t("publicTabs.practitioners"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={MOBILE_TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      {/* Discovery routes — publicly accessible to all users */}
      <Tabs.Screen
        name="discovery/index"
        options={{
          href: null,
          title: t("publicTabs.practitioners"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={MOBILE_TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discovery/[slug]"
        options={{
          href: null,
          title: t("publicTabs.practitioners"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={MOBILE_TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discovery/filters"
        options={{
          href: null,
          title: t("publicTabs.practitioners"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={MOBILE_TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="specialties"
        options={{
          href: null,
          title: t("publicTabs.specialties"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid" size={MOBILE_TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="packages"
        options={{
          href: null,
          title: t("publicTabs.packages"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="gift" size={MOBILE_TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
