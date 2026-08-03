import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/ui";
import { usePublicTheme } from "../theme/public-theme";
import { useAppDirection } from "../../../i18n/direction";

export function PublicPractitionerSignIn() {
  const router = useRouter();
  const { t } = useTranslation();
  const { publicTheme } = usePublicTheme();
  const { textAlign, rowDirection } = useAppDirection();

  return (
    <View style={styles.container}>
      {/* Practitioner Sign-In Touch Card */}
      <View style={styles.practitionerWrapper}>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/signin/practitioner")}
          style={[
            styles.practitionerCta,
            {
              backgroundColor: publicTheme.raisedSurface,
              borderColor: publicTheme.subtleBorder,
              flexDirection: rowDirection,
            },
          ]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t("publicHome.practitioner.button")}
        >
          <Ionicons name="medical-outline" size={16} color={publicTheme.primaryText} />
          <Text style={[styles.practitionerText, { color: publicTheme.secondaryText, textAlign }]}>
            {t("publicHome.practitioner.label")}{" "}
            <Text style={[styles.practitionerTextLink, { color: publicTheme.primaryText }]}>
              {t("publicHome.practitioner.button")}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingTop: 12,
    paddingBottom: 8,
  },
  practitionerWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  practitionerCta: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "rgba(5, 63, 56, 0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  practitionerText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  practitionerTextLink: {
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
