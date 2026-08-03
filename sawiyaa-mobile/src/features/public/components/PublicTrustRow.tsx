import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../../components/ui";
import { usePublicTheme } from "../theme/public-theme";
import { useAppDirection } from "../../../i18n/direction";
import { MOBILE_HORIZONTAL_PADDING } from "../../../components/mobile-shell";

export function PublicTrustRow() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { publicTheme } = usePublicTheme();
  const { textAlign, arrowForward } = useAppDirection();

  const isArabic = i18n.language === "ar";

  const valueItems = [
    {
      icon: "sparkles-outline" as const,
      title: t("publicHome.trust.clearChoice"),
      desc: isArabic ? "مسارات بداية تناسب احتياجك." : "Starting paths that fit your needs.",
    },
    {
      icon: "calendar-outline" as const,
      title: t("publicHome.trust.simpleBooking"),
      desc: isArabic ? "اعرف الموعد والسعر قبل التأكيد." : "See the time and price before confirming.",
    },
    {
      icon: "shield-checkmark-outline" as const,
      title: t("publicHome.trust.privacyPriority"),
      desc: isArabic ? "الجلسات والشات والدعم في مكان واضح." : "Sessions, chat, and support in one clear place.",
    },
  ];

  const steps = [
    {
      num: "١",
      title: isArabic ? "اختر المسار المناسب" : "Choose the right path",
      desc: isArabic ? "ابدأ بتخصص تعرفه، أو استخدم التوجيه إذا لم تكن متأكدًا من البداية." : "Start with a specialty you know, or use guided matching if you are not sure.",
      icon: "compass-outline" as const,
    },
    {
      num: "٢",
      title: isArabic ? "احجز جلستك بوضوح" : "Book your session clearly",
      desc: isArabic ? "اختر المتخصص والموعد المناسب، واعرف السعر وخطوات الدفع قبل التأكيد." : "Choose the right specialist and time, and know the price before confirming.",
      icon: "calendar-outline" as const,
    },
    {
      num: "٣",
      title: isArabic ? "تابع جلستك وخطوتك التالية" : "Follow your session and next step",
      desc: isArabic ? "ادخل الجلسة في الوقت المناسب، واستخدم الشات أو الدعم عندما يكون متاحًا." : "Join the session at the right time, and use chat or support when available.",
      icon: "rocket-outline" as const,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Section 4: Platform Commitment / Introduction */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.eyebrowText, { color: publicTheme.primaryText }]}>
            {isArabic ? "سويّة معك في كل خطوة" : "Sawiyaa with you at every step"}
          </Text>
          <View style={[styles.accentIndicator, { backgroundColor: publicTheme.primaryText }]} />
        </View>

        <View style={[styles.commitmentCard, { backgroundColor: publicTheme.raisedSurface, borderColor: publicTheme.subtleBorder }]}>
          <View style={[styles.commitmentIconBadge, { backgroundColor: publicTheme.accentMint }]}>
            <Ionicons name="shield-checkmark" size={24} color={publicTheme.primaryText} />
          </View>
          <Text style={[styles.commitmentTitle, { color: publicTheme.primaryText, textAlign }]}>
            {isArabic ? "منصة رعاية مسؤولة وموثوقة" : "Responsible & Trusted Care Platform"}
          </Text>
          <Text style={[styles.commitmentDesc, { color: publicTheme.secondaryText, textAlign }]}>
            {isArabic
              ? "سويّة منصة رعاية تساعدك على اختيار المتخصص المناسب وحجز جلساتك ومتابعة رحلتك بخطوات واضحة."
              : "Sawiyaa is a care platform that helps you choose the right specialist, book your sessions, and follow your journey with clear steps."}
          </Text>
        </View>
      </View>

      {/* Section 5: Three Stacked Mobile Value Cards */}
      <View style={styles.sectionContainer}>
        <View style={styles.valueCardsStack}>
          {valueItems.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.valueCard,
                {
                  backgroundColor: publicTheme.raisedSurface,
                  borderColor: publicTheme.subtleBorder,
                },
              ]}
            >
              <View style={[styles.valueIconCircle, { backgroundColor: publicTheme.accentMint }]}>
                <Ionicons name={item.icon} size={20} color={publicTheme.primaryText} />
              </View>
              <View style={styles.valueTextGroup}>
                <Text style={[styles.valueTitle, { color: publicTheme.primaryText, textAlign }]}>
                  {item.title}
                </Text>
                <Text style={[styles.valueDesc, { color: publicTheme.secondaryText, textAlign }]}>
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Section 6: How It Works Section */}
      <View style={[styles.howItWorksCard, { backgroundColor: publicTheme.accentMint, borderColor: publicTheme.subtleBorder }]}>
        <Text style={[styles.howTitle, { color: publicTheme.primaryText }]}>
          {isArabic ? "كيف تبدأ رعايتك مع سويّة؟" : "How does your care start with Sawiyaa?"}
        </Text>

        <View style={styles.stepsStack}>
          {steps.map((st, idx) => (
            <View key={idx} style={[styles.stepItem, { backgroundColor: publicTheme.raisedSurface }]}>
              <View style={[styles.stepBadge, { backgroundColor: publicTheme.primaryText }]}>
                <Text style={styles.stepNum}>{st.num}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: publicTheme.primaryText, textAlign }]}>
                  {st.title}
                </Text>
                <Text style={[styles.stepDesc, { color: publicTheme.secondaryText, textAlign }]}>
                  {st.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Section 7: Specialist Discovery Image Card */}
      <View style={[styles.discoveryCard, { backgroundColor: "#134E45" }]}>
        <Text style={[styles.discoveryTitle, { textAlign }]}>
          {isArabic ? "استكشف متخصصين بمعلومات واضحة تساعدك على الاختيار" : "Explore specialists with clear information to help you choose"}
        </Text>
        <Text style={[styles.discoveryDesc, { textAlign }]}>
          {isArabic ? "قارن بين الخبرة والتخصص والتوافر قبل أن تحجز جلستك." : "Compare experience, specialty, and availability before booking your session."}
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(public)/practitioners")}
          style={styles.discoveryBtn}
          activeOpacity={0.88}
        >
          <View style={styles.btnInner}>
            <Text style={styles.discoveryBtnText}>
              {isArabic ? "استكشف جميع المتخصصين" : "Explore all specialists"}
            </Text>
            <Ionicons name={arrowForward} size={16} color="#053F38" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Section 8: Specialty Discovery Image Card */}
      <View style={[styles.discoveryCard, { backgroundColor: "#2A403A" }]}>
        <Text style={[styles.discoveryTitle, { textAlign }]}>
          {isArabic ? "اختر المسار العلاجي الأقرب لك" : "Choose the care path closest to you"}
        </Text>
        <Text style={[styles.discoveryDesc, { textAlign }]}>
          {isArabic
            ? "استكشف التخصصات المتاحة، واعثر على متخصص يناسب احتياجك وطريقة تواصلك المفضلة."
            : "Explore available specialties and find a specialist that fits your need."}
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(public)/specialties")}
          style={styles.discoveryBtn}
          activeOpacity={0.88}
        >
          <View style={styles.btnInner}>
            <Text style={styles.discoveryBtnText}>
              {isArabic ? "عرض كل التخصصات" : "View all specialties"}
            </Text>
            <Ionicons name={arrowForward} size={16} color="#053F38" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Section 9: Final Patient Conversion CTA */}
      <View style={[styles.finalCtaCard, { backgroundColor: publicTheme.primaryText }]}>
        <Text style={styles.finalTitle}>
          {isArabic ? "ابدأ بخطوة واضحة نحو الرعاية المناسبة لك" : "Start with a clear step toward the right care for you"}
        </Text>
        <Text style={styles.finalSubtitle}>
          {isArabic
            ? "اختر متخصصًا مباشرة، أو ابدأ بتوجيه بسيط إذا لم تكن متأكدًا من البداية."
            : "Choose a specialist directly, or start with simple guided matching."}
        </Text>

        <View style={styles.finalActions}>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signup/patient")}
            style={styles.finalPrimaryBtn}
            activeOpacity={0.88}
          >
            <Text style={styles.finalPrimaryText}>
              {t("publicHome.hero.startJourney")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/signin/patient")}
            style={styles.finalSecondaryBtn}
            activeOpacity={0.88}
          >
            <Text style={styles.finalSecondaryText}>
              {t("publicHome.hero.secondaryCta")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
    paddingBottom: 16,
    gap: 16,
  },
  sectionContainer: {
    width: "100%",
  },
  sectionHeader: {
    marginBottom: 10,
  },
  eyebrowText: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  accentIndicator: {
    width: 32,
    height: 3,
    borderRadius: 2,
  },
  commitmentCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  commitmentIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  commitmentTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  commitmentDesc: {
    fontSize: 14,
    lineHeight: 21,
  },
  valueCardsStack: {
    gap: 10,
  },
  valueCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  valueIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  valueTextGroup: {
    flex: 1,
  },
  valueTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  valueDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  howItWorksCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  howTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  stepsStack: {
    gap: 10,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  stepNum: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 3,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  discoveryCard: {
    borderRadius: 24,
    padding: 22,
    gap: 10,
    shadowColor: "rgba(0,0,0,0.15)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  discoveryTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 28,
  },
  discoveryDesc: {
    color: "#D1E5DE",
    fontSize: 14,
    lineHeight: 21,
  },
  discoveryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 6,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  discoveryBtnText: {
    color: "#053F38",
    fontSize: 14,
    fontWeight: "800",
  },
  finalCtaCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 10,
    shadowColor: "rgba(5, 63, 56, 0.3)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  finalTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 30,
  },
  finalSubtitle: {
    color: "#D1E5DE",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 6,
  },
  finalActions: {
    width: "100%",
    gap: 10,
  },
  finalPrimaryBtn: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  finalPrimaryText: {
    color: "#053F38",
    fontSize: 15,
    fontWeight: "800",
  },
  finalSecondaryBtn: {
    width: "100%",
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  finalSecondaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
