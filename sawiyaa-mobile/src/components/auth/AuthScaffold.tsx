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
        <View style={styles.centerContainer}>
          {/* Safe-area Header with Back Navigation */}
          <View style={[styles.navHeader, { flexDirection: rowDirection }]}>
            {showBackButton ? (
              <TouchableOpacity
                onPress={handleBack}
                style={[
                  styles.backButton,
                  {
                    backgroundColor: publicTheme.raisedSurface,
                    borderColor: publicTheme.subtleBorder,
                  },
                ]}
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

          {/* Form & Hero Unified Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: publicTheme.raisedSurface,
                borderColor: publicTheme.subtleBorder,
              },
            ]}
          >
            {/* Header Hero Area */}
            <View style={styles.heroSection}>
              {eyebrow ? (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: publicTheme.accentMint,
                      borderColor: publicTheme.subtleBorder,
                    },
                  ]}
                >
                  <Text
                    color={publicTheme.primaryText}
                    weight="700"
                    style={styles.badgeText}
                  >
                    {eyebrow}
                  </Text>
                </View>
              ) : null}
              <Text
                weight="bold"
                style={styles.title}
                color={publicTheme.primaryText}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} color={publicTheme.secondaryText}>
                  {subtitle}
                </Text>
              ) : null}
            </View>

            {/* Form Body */}
            {children}
          </View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    flexGrow: 1,
    justifyContent: "center",
  },
  centerContainer: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  navHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonPlaceholder: {
    width: 40,
  },
  headerLogoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogo: {
    width: 120,
    height: 38,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 24,
    shadowColor: "rgba(5, 63, 56, 0.08)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  badge: {
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },
  footer: {
    marginTop: 16,
  },
});
