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
    paddingBottom: 28,
  },
  hero: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 26,
    marginTop: 12,
    marginBottom: 18,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 24,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  footer: {
    marginTop: 16,
  },
});
