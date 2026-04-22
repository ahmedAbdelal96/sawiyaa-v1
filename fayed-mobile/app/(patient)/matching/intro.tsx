import React from "react";
import { View, StyleSheet, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Header, Text, Button } from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const INTRO_HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCWXC3LqMonqKYo2GfA7Ln2wNcwdeGDpk0w2PIfP4QB4ArHtPtPfkudzDJH01Wz8AUp_fZqEIk7aEkOeyDAJ7TeBOS7jFYynFXPy-Z2YSqUQHQ_i0lOCcrOzDeBSk0wYKlpLG8wDkETQ_Rav_e1hdaAHj4OU6hETYJ20F_6jwAiGPZ9pVc48V2kC23t_N82LgXxQY_eeZmhZlLAluJg4_weXkII-mdKzhLYNJqOzbjUn_6-9KBkHWblO88d3M6ofEjcjjoufkYP2Uyz";

export default function MatchingIntroScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <Screen bg="background" style={styles.screen}>
      <Header showBack onBack={() => router.back()} />
      <View style={styles.container}>
        <View style={styles.content}>
          <View
            style={[
              styles.imageWrap,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderLight,
              },
            ]}
          >
            <Image
              source={{ uri: INTRO_HERO_IMAGE }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View
              style={[
                styles.imageOverlay,
                { backgroundColor: theme.colors.background },
              ]}
            />
          </View>

          <Text weight="bold" style={styles.title}>
            {t("matching.intro.title")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.description}>
            {t("matching.intro.subtitle")}
          </Text>
        </View>

        <View style={styles.footer}>
          <Button
            title={t("matching.intro.start")}
            onPress={() => router.push("/(patient)/matching/questions")}
            style={styles.primaryAction}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.replace("/(patient)")}
          >
            <Text
              color={theme.colors.textBrand}
              weight="600"
              style={styles.secondaryAction}
            >
              {t("matching.intro.alreadyAccount")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  imageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 26,
    shadowColor: "#181c20",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 3,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
  },
  title: {
    fontSize: 44,
    lineHeight: 56,
    textAlign: "center",
    marginBottom: 14,
  },
  description: {
    fontSize: 23,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 37,
    paddingHorizontal: 8,
  },
  footer: {
    paddingBottom: 12,
    gap: 14,
  },
  primaryAction: {
    borderRadius: 14,
    paddingVertical: 17,
  },
  secondaryAction: {
    fontSize: 17,
    textAlign: "center",
  },
});
