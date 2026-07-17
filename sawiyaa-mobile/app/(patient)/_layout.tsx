import React from "react";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";
import { useTheme } from "../../src/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MOBILE_TAB_BAR_HEIGHT,
  MOBILE_TAB_ICON_SIZE,
} from "../../src/components/mobile-shell";
import ReviewReminderModal from "../../src/features/patient/reviews/components/ReviewReminderModal";

export default function PatientLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarActiveBackgroundColor: theme.colors.primarySoft,
          tabBarInactiveBackgroundColor: theme.colors.surfaceRaised,
          tabBarStyle: {
            backgroundColor: theme.colors.surfaceRaised,
            borderTopColor: theme.colors.divider,
            borderTopWidth: StyleSheet.hairlineWidth,
            ...theme.shadows.sm,
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
        <Tabs.Screen name="academy/enroll/[slug]" options={{ href: null }} />
        <Tabs.Screen name="academy/program-enrollments/[id]" options={{ href: null }} />
        <Tabs.Screen
          name="academy/program-enrollments/[id]/payment-return"
          options={{ href: null }}
        />
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
        <Tabs.Screen
          name="support/new"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="support/[id]"
          options={{ href: null }}
        />
        <Tabs.Screen name="messages/index" options={{ href: null }} />
        <Tabs.Screen
          name="messages/[id]"
          options={{ href: null }}
        />
        <Tabs.Screen name="profile-details" options={{ href: null }} />
        <Tabs.Screen name="profile-details/edit" options={{ href: null }} />
        <Tabs.Screen name="profile-preferences" options={{ href: null }} />
        <Tabs.Screen name="profile-notifications" options={{ href: null }} />
        <Tabs.Screen name="care-chat/index" options={{ href: null }} />
        <Tabs.Screen
          name="care-chat/new"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="care-chat/[id]"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="care-chat/request/[id]"
          options={{ href: null }}
        />
        <Tabs.Screen name="instant-booking" options={{ href: null }} />
      </Tabs>
      <ReviewReminderModal />
    </>
  );
}
