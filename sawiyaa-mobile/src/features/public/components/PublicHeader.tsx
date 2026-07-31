import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/ui";
import { usePublicTheme } from "../theme/public-theme";
import { useAppDirection } from "../../../i18n/direction";
import { MOBILE_HORIZONTAL_PADDING } from "../../../components/mobile-shell";

export function PublicHeader() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { publicTheme } = usePublicTheme();
  const { isRTL, rowDirection, textAlign } = useAppDirection();

  const handleToggleLanguage = () => {
    const nextLang = i18n.language === "ar" ? "en" : "ar";
    void i18n.changeLanguage(nextLang);
    if (typeof document !== "undefined") {
      document.documentElement.dir = nextLang === "ar" ? "rtl" : "ltr";
    }
  };

  return (
    <View
      style={[
        styles.header,
        {
          flexDirection: rowDirection,
          backgroundColor: publicTheme.canvas,
          borderBottomColor: publicTheme.subtleBorder,
        },
      ]}
    >
      <View style={styles.brandContainer}>
        <Text
          variant="h2"
          style={[
            styles.brandText,
            {
              color: publicTheme.primaryText,
              textAlign,
            },
          ]}
        >
          {t("publicHome.brandName")}
        </Text>
      </View>

      <View style={[styles.headerActions, { flexDirection: rowDirection }]}>
        <TouchableOpacity
          onPress={handleToggleLanguage}
          style={styles.langBtn}
          accessibilityRole="button"
          accessibilityLabel={isRTL ? t("publicHome.header.languageEnglish") : t("publicHome.header.languageArabic")}
        >
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 6 }}>
            <Ionicons name="language-outline" size={16} color={publicTheme.secondaryText} importantForAccessibility="no" />
            <Text style={[styles.langBtnText, { color: publicTheme.secondaryText }]}>
              {i18n.language === "ar" ? "EN" : "العربية"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)")}
          style={[styles.signInBtn, { backgroundColor: publicTheme.primaryText }]}
          accessibilityRole="button"
          accessibilityLabel={t("publicHome.header.signIn")}
        >
          <Text style={styles.signInBtnText} color="#FFFFFF">
            {t("publicHome.header.signIn")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    zIndex: 100,
  },
  brandContainer: {
    justifyContent: "center",
  },
  brandText: {
    fontWeight: "800",
    fontSize: 22,
    letterSpacing: 0.5,
  },
  headerActions: {
    alignItems: "center",
    gap: 12,
  },
  langBtn: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  signInBtn: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 48,
  },
  signInBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
