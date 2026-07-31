import React from "react";
import { StyleSheet, View, Text, useWindowDimensions, I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import { usePublicTheme } from "../../src/features/public/theme/public-theme";
import {
  PublicPageContainer,
  PublicHeader,
  PublicHero,
  PublicSectionHeading,
  PublicFeatureCard,
  PublicJourney,
  PublicDiscoveryCard,
  PublicPatientCta,
  PublicPractitionerSignIn,
  PublicSereneVisual,
} from "../../src/features/public/components";
import { MOBILE_HORIZONTAL_PADDING } from "../../src/components/mobile-shell";

export default function PublicHomeScreen() {
  const { t, i18n } = useTranslation();
  const { publicTheme } = usePublicTheme();
  const { width } = useWindowDimensions();

  const isRTL = i18n.language?.startsWith("ar") ?? I18nManager.isRTL;
  const isArabic = i18n.language?.startsWith("ar");

  /*
    Bento Grid Responsive Logic:
    - Arabic text must never be compressed into narrow cards, so it always stacks vertically (single column).
    - For English:
      - viewports >= 390 (e.g. 390x844, 430x932) show one wide featured card followed by a 2-column row for supporting cards.
      - viewports < 390 (e.g. 360x640) stack all cards vertically.
  */
  const useSingleColumn = isArabic || width < 390;

  // Editorial specialties list translated dynamically (Zero fallbacks)
  const specialties = [
    t("publicHome.specialties.anxiety"),
    t("publicHome.specialties.depression"),
    t("publicHome.specialties.family"),
    t("publicHome.specialties.self"),
    t("publicHome.specialties.adolescent"),
  ];

  return (
    <PublicPageContainer>
      {/* 1. Header TopAppBar */}
      <PublicHeader />

      {/* 2. Hero Section */}
      <PublicHero />

      {/* 3. Serene Visual Card */}
      <PublicSereneVisual />

      {/* 4. Commitment Section (Editorial - No surrounding card border) */}
      <View style={styles.section}>
        <PublicSectionHeading
          eyebrow={t("publicHome.commitment.eyebrow")}
          title={t("publicHome.commitment.title")}
        />

        <View style={styles.editorialPadding}>
          <Text style={[styles.editorialDesc, { color: publicTheme.secondaryText, textAlign: isRTL ? "right" : "left" }]}>
            {t("publicHome.commitment.desc")}
          </Text>
        </View>
      </View>

      {/* 5. Staggered Bento Grid / Responsive Values Section */}
      <View style={styles.section}>
        {useSingleColumn ? (
          <View style={styles.bentoVertical}>
            <PublicFeatureCard
              icon="checkmark-done-circle-outline"
              title={t("publicHome.features.clearChoice.title")}
              desc={t("publicHome.features.clearChoice.desc")}
            />
            <PublicFeatureCard
              icon="calendar-outline"
              title={t("publicHome.features.flexibleBooking.title")}
              desc={t("publicHome.features.flexibleBooking.desc")}
            />
            <PublicFeatureCard
              icon="lock-closed-outline"
              title={t("publicHome.features.privacyPriority.title")}
              desc={t("publicHome.features.privacyPriority.desc")}
            />
          </View>
        ) : (
          <View style={styles.bentoVertical}>
            {/* Wide Featured Card */}
            <PublicFeatureCard
              icon="checkmark-done-circle-outline"
              title={t("publicHome.features.clearChoice.title")}
              desc={t("publicHome.features.clearChoice.desc")}
            />
            {/* Two supporting cards in a 2-column row */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12, width: "100%" }}>
              <PublicFeatureCard
                icon="calendar-outline"
                title={t("publicHome.features.flexibleBooking.title")}
                desc={t("publicHome.features.flexibleBooking.desc")}
                style={{ flex: 1 }}
              />
              <PublicFeatureCard
                icon="lock-closed-outline"
                title={t("publicHome.features.privacyPriority.title")}
                desc={t("publicHome.features.privacyPriority.desc")}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </View>

      {/* 6. Specialties Preview (Editorial Categories List - No fetching) */}
      <View style={styles.section}>
        <PublicSectionHeading
          title={t("publicHome.specialties.title")}
        />

        <View style={styles.specialtiesWrapper}>
          <View style={[styles.specialtiesGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {specialties.map((spec, idx) => (
              <View
                key={idx}
                style={[
                  styles.specialtyPill,
                  {
                    backgroundColor: publicTheme.raisedSurface,
                    borderColor: publicTheme.subtleBorder,
                  },
                ]}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: publicTheme.primaryText }}>
                  {spec}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 7. How It Works Timeline */}
      <PublicJourney />

      {/* 8. Teaser / Discovery Section (Stronger compositions and vertical stacking) */}
      <View style={styles.section}>
        <View style={styles.sectionPadding}>
          <View style={[styles.teaserGrid, { flexDirection: useSingleColumn ? "column" : (isRTL ? "row-reverse" : "row") }]}>
            <PublicDiscoveryCard
              title={t("publicHome.teasers.practitioners.title")}
              desc={t("publicHome.teasers.practitioners.desc")}
            />
            <PublicDiscoveryCard
              title={t("publicHome.teasers.specialties.title")}
              desc={t("publicHome.teasers.specialties.desc")}
              isSecondary
            />
          </View>
        </View>
      </View>

      {/* 9. Patient CTA */}
      <PublicPatientCta />

      {/* 10. Practitioner Sign In link */}
      <PublicPractitionerSignIn />
    </PublicPageContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 36,
  },
  sectionPadding: {
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
  },
  editorialPadding: {
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
    marginTop: 4,
  },
  editorialDesc: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
  },
  bentoVertical: {
    gap: 12,
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
  },
  specialtiesWrapper: {
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
  },
  specialtiesGrid: {
    flexWrap: "wrap",
    gap: 10,
  },
  specialtyPill: {
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: "rgba(0, 0, 0, 0.02)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  teaserGrid: {
    gap: 16,
  },
});
