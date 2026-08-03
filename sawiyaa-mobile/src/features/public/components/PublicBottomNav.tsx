import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/ui";
import { usePublicTheme } from "../theme/public-theme";

export function PublicBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { i18n } = useTranslation();
  const { publicTheme } = usePublicTheme();

  const isArabic = i18n.language === "ar";

  const tabs = [
    {
      key: "home",
      label: isArabic ? "الرئيسية" : "Home",
      icon: "home" as const,
      route: "/(public)",
      active: pathname === "/(public)" || pathname === "/",
    },
    {
      key: "practitioners",
      label: isArabic ? "المختصون" : "Specialists",
      icon: "people" as const,
      route: "/(public)/practitioners",
      active: pathname === "/(public)/practitioners",
    },
    {
      key: "specialties",
      label: isArabic ? "التخصصات" : "Specialties",
      icon: "grid" as const,
      route: "/(public)/specialties",
      active: pathname === "/(public)/specialties",
    },
    {
      key: "packages",
      label: isArabic ? "الباقات" : "Packages",
      icon: "gift" as const,
      route: "/(public)/packages",
      active: pathname === "/(public)/packages",
    },
  ];

  return (
    <View
      style={[
        styles.fixedBottomContainer,
        {
          backgroundColor: publicTheme.raisedSurface,
          borderTopColor: publicTheme.subtleBorder,
        },
      ]}
    >
      <View style={styles.bottomNavRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => router.push(tab.route as any)}
            style={styles.navItem}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={tab.active ? publicTheme.primaryText : publicTheme.secondaryText}
            />
            <Text
              style={[
                styles.navLabel,
                {
                  color: tab.active ? publicTheme.primaryText : publicTheme.secondaryText,
                  fontWeight: tab.active ? "800" : "600",
                },
              ]}
            >
              {tab.label}
            </Text>
            {tab.active && <View style={[styles.activeDot, { backgroundColor: publicTheme.primaryText }]} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fixedBottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "rgba(0,0,0,0.08)",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 12,
    minHeight: 44,
    minWidth: 64,
  },
  navLabel: {
    fontSize: 11.5,
    marginTop: 3,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
