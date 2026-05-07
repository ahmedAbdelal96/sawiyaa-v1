import React from "react";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../src/providers/ThemeProvider";
import { I18nManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TabIcon = ({
  name,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
}) => {
  return <Ionicons name={name} size={24} color={color} />;
};

export default function PatientLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;
  const insets = useSafeAreaInsets();

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
          title: t("home.tabLabel", "Home"),
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="assessments/index"
        options={{
          title: t("assessments.tab"),
          tabBarIcon: ({ color }) => <TabIcon name="clipboard" color={color} />,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: t("sessions"),
          tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: t("patientPaymentsFlow.tab"),
          tabBarIcon: ({ color }) => (
            <TabIcon name="wallet-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          tabBarIcon: ({ color }) => <TabIcon name="person" color={color} />,
        }}
      />
      {/* Hide stack routes from bottom tabs manually */}
      <Tabs.Screen name="discovery/index" options={{ href: null }} />
      <Tabs.Screen name="discovery/filters" options={{ href: null }} />
      <Tabs.Screen name="discovery/[slug]" options={{ href: null }} />
      <Tabs.Screen name="sessions/select-time" options={{ href: null }} />
      <Tabs.Screen name="sessions/confirm" options={{ href: null }} />
      <Tabs.Screen name="sessions/success" options={{ href: null }} />
      <Tabs.Screen name="sessions/[id]" options={{ href: null }} />
      <Tabs.Screen name="sessions/[id]/pay" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen
        name="sessions/[id]/payment-return"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="sessions/[id]/cancel-preview"
        options={{ href: null }}
      />
      <Tabs.Screen name="payments/transactions" options={{ href: null }} />
      <Tabs.Screen name="matching/intro" options={{ href: null }} />
      <Tabs.Screen name="matching/questions" options={{ href: null }} />
      <Tabs.Screen name="matching/results" options={{ href: null }} />
      <Tabs.Screen name="assessments/[slug]" options={{ href: null }} />
      <Tabs.Screen
        name="assessments/[slug]/questions"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="assessments/submissions/[submissionId]"
        options={{ href: null }}
      />
      <Tabs.Screen name="support/index" options={{ href: null }} />
      <Tabs.Screen name="support/new" options={{ href: null }} />
      <Tabs.Screen name="support/[id]" options={{ href: null }} />
      <Tabs.Screen name="profile-details" options={{ href: null }} />
      <Tabs.Screen name="profile-preferences" options={{ href: null }} />
      <Tabs.Screen name="profile-notifications" options={{ href: null }} />
      <Tabs.Screen name="care-chat/index" options={{ href: null }} />
      <Tabs.Screen name="care-chat/new" options={{ href: null }} />
      <Tabs.Screen name="care-chat/[id]" options={{ href: null }} />
      <Tabs.Screen name="care-chat/request/[id]" options={{ href: null }} />
    </Tabs>
  );
}
