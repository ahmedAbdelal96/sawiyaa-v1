import React from "react";
import { StyleSheet, View, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/ui";
import { usePublicTheme } from "../theme/public-theme";
import { useAppDirection } from "../../../i18n/direction";
import { MOBILE_HORIZONTAL_PADDING } from "../../../components/mobile-shell";

export function PublicHero() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { publicTheme } = usePublicTheme();
  const { textAlign, arrowForward, rowDirection } = useAppDirection();

  const isArabic = i18n.language === "ar";

  const badgeText = isArabic
    ? "رعاية نفسية عربية أكثر قربًا"
    : "Mental care that feels calmer and closer";
  const headlineText = isArabic
    ? "ابدأ رحلة رعاية نفسية"
    : "Start your mental health care journey";
  const subtext = isArabic
    ? "اكتشف المتخصص المناسب، احجز جلستك بسهولة، وتابع خطواتك من مكان واحد — من الاختيار حتى الجلسة والدعم عند الحاجة."
    : "Find the right specialist, book your session easily, and track your steps in one place — from choosing to session and support when needed.";

  return (
    <View style={styles.container}>
      {/* Section 2: Real Web Hero Content */}
      <View style={styles.heroTextSection}>
        {/* Soft Brand Badge */}
        <View
          style={[
            styles.badgeContainer,
            {
              backgroundColor: publicTheme.accentMint,
              flexDirection: rowDirection,
            },
          ]}
        >
          <Ionicons
            name="sparkles-outline"
            size={14}
            color={publicTheme.primaryText}
            importantForAccessibility="no"
          />
          <Text style={[styles.badgeText, { color: publicTheme.primaryText }]}>
            {badgeText}
          </Text>
        </View>

        {/* Headline */}
        <Text
          style={[
            styles.heroHeadline,
            { color: publicTheme.primaryText, textAlign },
          ]}
        >
          {headlineText}
        </Text>

        {/* Subtext */}
        <Text
          style={[
            styles.heroSubtext,
            { color: publicTheme.secondaryText, textAlign },
          ]}
        >
          {subtext}
        </Text>

        {/* Primary Hero Actions */}
        <View style={styles.actionsContainer}>
          {/* Primary Action: Browse Practitioners */}
          <TouchableOpacity
            onPress={() => router.push("/(public)/practitioners")}
            style={[
              styles.primaryCtaBtn,
              { backgroundColor: publicTheme.primaryText },
            ]}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={t("publicHome.hero.chooseSpecialist")}
          >
            <View style={[styles.btnInner, { flexDirection: rowDirection }]}>
              <Text style={styles.primaryCtaText} color="#FFFFFF">
                {t("publicHome.hero.chooseSpecialist")}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Secondary Action: Explore Specialties */}
          <TouchableOpacity
            onPress={() => router.push("/(public)/specialties")}
            style={[
              styles.secondaryCtaBtn,
              {
                backgroundColor: publicTheme.accentMint,
                borderColor: publicTheme.subtleBorder,
              },
            ]}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={t("publicHome.hero.helpChoose")}
          >
            <Text
              style={[
                styles.secondaryCtaText,
                { color: publicTheme.primaryText },
              ]}
            >
              {t("publicHome.hero.helpChoose")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Clear Role Entry Cards (Above the fold - Distinct touch cards) */}
        <View style={styles.rolePortalsContainer}>
          {/* Patient Account Sign-In Card */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signin/patient")}
            style={[
              styles.portalCard,
              {
                backgroundColor: publicTheme.raisedSurface,
                borderColor: publicTheme.subtleBorder,
                flexDirection: rowDirection,
              },
            ]}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={t("publicHome.hero.secondaryCta")}
          >
            <View
              style={[
                styles.portalIconBox,
                { backgroundColor: "rgba(5, 63, 56, 0.08)" },
              ]}
            >
              <Ionicons
                name="person-circle-outline"
                size={20}
                color={publicTheme.primaryText}
              />
            </View>
            <View style={styles.portalTextWrap}>
              <Text
                style={[
                  styles.portalTitle,
                  { color: publicTheme.primaryText, textAlign },
                ]}
                weight="bold"
              >
                {t("publicHome.hero.secondaryCta")}
              </Text>
              <Text
                style={[
                  styles.portalSubtitle,
                  { color: publicTheme.secondaryText, textAlign },
                ]}
              >
                {isArabic
                  ? "متابعة حساب الجلسات والتقييمات"
                  : "Sign in to manage sessions"}
              </Text>
            </View>
            <Ionicons
              name={arrowForward}
              size={16}
              color={publicTheme.primaryText}
            />
          </TouchableOpacity>

          {/* Patient Signup Quick Link */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signup/patient")}
            style={[styles.signupBar, { flexDirection: rowDirection }]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("publicHome.hero.startJourney")}
          >
            <Text style={{ color: publicTheme.secondaryText, fontSize: 13 }}>
              {isArabic ? "ليس لديك حساب مريض؟" : "Don't have an account?"}
            </Text>
            <Text
              style={[styles.signupBarLink, { color: publicTheme.primaryText }]}
            >
              {t("publicHome.hero.startJourney")}
            </Text>
          </TouchableOpacity>

          {/* Practitioner Portal Card (Prominent & Clear at Top) */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signin/practitioner")}
            style={[
              styles.portalCard,
              {
                backgroundColor: publicTheme.accentMint,
                borderColor: publicTheme.subtleBorder,
                flexDirection: rowDirection,
              },
            ]}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={t("publicHome.practitioner.button")}
          >
            <View
              style={[
                styles.portalIconBox,
                { backgroundColor: publicTheme.raisedSurface },
              ]}
            >
              <Ionicons
                name="medical-outline"
                size={20}
                color={publicTheme.primaryText}
              />
            </View>
            <View style={styles.portalTextWrap}>
              <Text
                style={[
                  styles.portalTitle,
                  { color: publicTheme.primaryText, textAlign },
                ]}
                weight="bold"
              >
                {t("publicHome.practitioner.button")}
              </Text>
              <Text
                style={[
                  styles.portalSubtitle,
                  { color: publicTheme.primaryText, textAlign },
                ]}
              >
                {isArabic
                  ? "بوابة الأطباء والمعالجين النفسيين"
                  : "Specialist & Doctor Portal"}
              </Text>
            </View>
            <Ionicons
              name={arrowForward}
              size={16}
              color={publicTheme.primaryText}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section 3: Hero Media Card */}
      <View
        style={[styles.mediaCard, { borderColor: publicTheme.subtleBorder }]}
      >
        <Image
          source={require("../../../../assets/banner.png")}
          style={styles.mediaImage}
          resizeMode="cover"
        />
        <View style={styles.mediaOverlay} />
        <View
          style={[
            styles.mediaBadge,
            {
              backgroundColor: publicTheme.raisedSurface,
              flexDirection: rowDirection,
            },
          ]}
        >
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={publicTheme.primaryText}
          />
          <Text
            style={[styles.mediaBadgeText, { color: publicTheme.primaryText }]}
          >
            {isArabic ? "رعاية معتمدة وآمنة" : "Certified & Secure Care"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
    paddingTop: 14,
    paddingBottom: 14,
  },
  heroTextSection: {
    marginBottom: 16,
  },
  badgeContainer: {
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  heroHeadline: {
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 33,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  heroSubtext: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
    opacity: 0.9,
  },
  actionsContainer: {
    width: "100%",
    gap: 10,
    marginBottom: 14,
  },
  primaryCtaBtn: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(5, 63, 56, 0.2)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  btnInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryCtaText: {
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryCtaBtn: {
    width: "100%",
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryCtaText: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  rolePortalsContainer: {
    width: "100%",
    gap: 10,
    marginTop: 4,
  },
  portalCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    minHeight: 54,
    gap: 12,
  },
  portalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  portalTextWrap: {
    flex: 1,
    gap: 2,
  },
  portalTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  portalSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  signupBar: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
    minHeight: 36,
  },
  signupBarLink: {
    fontSize: 13,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  mediaCard: {
    width: "100%",
    height: 180,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.08)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 63, 56, 0.15)",
  },
  mediaBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mediaBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
});
