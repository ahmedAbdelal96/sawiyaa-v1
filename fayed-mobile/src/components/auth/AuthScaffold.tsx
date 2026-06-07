import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Screen, Text } from "../ui";
import { useTheme } from "../../providers/ThemeProvider";

interface AuthScaffoldProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthScaffold({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthScaffoldProps) {
  const { theme } = useTheme();

  return (
    <Screen safeArea bg="background">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.hero, { backgroundColor: theme.colors.primaryLight }]}
        >
          <View
            style={[styles.badge, { borderColor: theme.colors.borderStrong }]}
          >
            <Text
              color={theme.colors.textBrand}
              weight="600"
              style={styles.badgeText}
            >
              {eyebrow}
            </Text>
          </View>
          <Text
            weight="bold"
            style={styles.title}
            color={theme.colors.textPrimary}
          >
            {title}
          </Text>
          <Text style={styles.subtitle} color={theme.colors.textSecondary}>
            {subtitle}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderLight,
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
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  hero: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    marginTop: 10,
    marginBottom: 14,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 11,
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  footer: {
    marginTop: 12,
  },
});
