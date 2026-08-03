import React from "react";
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Screen, Text } from "../ui";
import { usePublicTheme } from "../../features/public/theme/public-theme";
import { useAppDirection } from "../../i18n/direction";

interface AuthScaffoldProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export function AuthScaffold({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  showBackButton = true,
  onBackPress,
}: AuthScaffoldProps) {
  const router = useRouter();
  const { publicTheme } = usePublicTheme();
  const { arrowBack, rowDirection } = useAppDirection();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.push("/(public)");
    }
  };

  return (
    <Screen safeArea bg="background" style={{ backgroundColor: publicTheme.canvas, flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Safe-area Header with Back Navigation */}
        <View style={[styles.navHeader, { flexDirection: rowDirection }]}>
          {showBackButton ? (
            <TouchableOpacity
              onPress={handleBack}
              style={[styles.backButton, { backgroundColor: publicTheme.raisedSurface, borderColor: publicTheme.subtleBorder }]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Back to Home"
            >
              <Ionicons name={arrowBack} size={18} color={publicTheme.primaryText} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}

          <View style={styles.headerLogoContainer}>
            <Image
              source={require("../../../assets/logo_transparent.png")}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.backButtonPlaceholder} />
        </View>

        {/* Hero Banner */}
        <View
          style={[styles.hero, { backgroundColor: publicTheme.accentMint, borderColor: publicTheme.subtleBorder }]}
        >
          <View
            style={[styles.badge, { backgroundColor: publicTheme.raisedSurface, borderColor: publicTheme.subtleBorder }]}
          >
            <Text
              color={publicTheme.primaryText}
              weight="700"
              style={styles.badgeText}
            >
              {eyebrow}
            </Text>
          </View>
          <Text
            weight="bold"
            style={styles.title}
            color={publicTheme.primaryText}
          >
            {title}
          </Text>
          <Text style={styles.subtitle} color={publicTheme.secondaryText}>
            {subtitle}
          </Text>
        </View>

        {/* Form Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: publicTheme.raisedSurface,
              borderColor: publicTheme.subtleBorder,
            },
          ]}
        >
          {children}
        </View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 24,
  },
  navHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    marginBottom: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonPlaceholder: {
    width: 36,
  },
  headerLogoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogo: {
    width: 110,
    height: 34,
  },
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 12,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11.5,
  },
  title: {
    fontSize: 21,
    lineHeight: 28,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: "rgba(5, 63, 56, 0.08)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  footer: {
    marginTop: 12,
  },
});
