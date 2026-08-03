import React from "react";
import { StyleSheet, View, TouchableOpacity, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/ui";
import { usePublicTheme } from "../theme/public-theme";
import { useAppDirection } from "../../../i18n/direction";
import { MOBILE_HORIZONTAL_PADDING } from "../../../components/mobile-shell";

export function PublicHeader() {
  const { t, i18n } = useTranslation();
  const { publicTheme } = usePublicTheme();
  const { isRTL, textAlign, rowDirection } = useAppDirection();

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
          backgroundColor: publicTheme.canvas,
          borderBottomColor: publicTheme.subtleBorder,
          flexDirection: rowDirection,
        },
      ]}
    >
      {/* Brand logo / wordmark */}
      <View style={[styles.brandContainer, { flexDirection: rowDirection }]}>
        <Image
          source={require("../../../../assets/logo_transparent.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
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

      {/* Header Actions - Pure Minimalist (Language Switcher Only) */}
      <View style={[styles.headerActions, { flexDirection: rowDirection }]}>
        <TouchableOpacity
          onPress={handleToggleLanguage}
          style={[styles.langBtn, { backgroundColor: publicTheme.raisedSurface, borderColor: publicTheme.subtleBorder }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isRTL ? t("publicHome.header.languageEnglish") : t("publicHome.header.languageArabic")}
        >
          <View style={[styles.langInner, { flexDirection: rowDirection }]}>
            <Ionicons name="globe-outline" size={15} color={publicTheme.primaryText} importantForAccessibility="no" />
            <Text style={[styles.langBtnText, { color: publicTheme.primaryText }]}>
              {i18n.language === "ar" ? "EN" : "العربية"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    zIndex: 100,
  },
  brandContainer: {
    alignItems: "center",
    gap: 8,
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  brandText: {
    fontWeight: "800",
    fontSize: 20,
    letterSpacing: -0.3,
  },
  headerActions: {
    alignItems: "center",
  },
  langBtn: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  langInner: {
    alignItems: "center",
    gap: 4,
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
