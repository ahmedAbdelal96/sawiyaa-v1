import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  TouchableOpacity,
  BackHandler,
  Alert,
  I18nManager,
  Animated,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, PrimaryButton } from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { setOnboardingCompleted } from "../../src/features/onboarding/services/onboarding-preferences";
import { resolveNextIndex } from "../../src/features/onboarding/utils/gesture-resolver";
import { getDirectionalIcon } from "../../src/i18n/direction";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function OnboardingScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isRTL = i18n.language?.startsWith("ar") ?? I18nManager.isRTL;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animated value representing the logical scroll position (0 to 2 * windowWidth)
  const scrollX = useRef(new Animated.Value(0)).current;

  // Track animation state to prevent gesture & button race conditions
  const isAnimating = useRef(false);

  // Keep state updated in a mutable ref to prevent PanResponder closures
  const stateRef = useRef({ activeIndex, isRTL, windowWidth });
  stateRef.current = { activeIndex, isRTL, windowWidth };

  // Animate slide change smoothly
  useEffect(() => {
    isAnimating.current = true;
    Animated.spring(scrollX, {
      toValue: activeIndex * windowWidth,
      useNativeDriver: true,
      bounciness: 0,
    }).start(() => {
      isAnimating.current = false;
    });
  }, [activeIndex, windowWidth]);

  // 1. Android Hardware Back Button Handling
  useEffect(() => {
    const handleBackPress = () => {
      if (activeIndex === 0) return true;
      setActiveIndex(activeIndex - 1);
      return true;
    };
    BackHandler.addEventListener("hardwareBackPress", handleBackPress);
    return () => BackHandler.removeEventListener("hardwareBackPress", handleBackPress);
  }, [activeIndex]);

  // 2. PanResponder implementation for horizontal swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Prevent capturing gestures during an active slide transition animation
        if (isAnimating.current) return false;
        // Respond to horizontal swipes primarily (ignore vertical scrolling)
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 10
        );
      },
      onPanResponderMove: (_, gestureState) => {
        const { activeIndex: currentIdx, isRTL: currentRTL, windowWidth: currentWidth } = stateRef.current;
        const baseOffset = currentIdx * currentWidth;

        // In RTL, swipe right (dx > 0) scrolls next (increases scrollX).
        // In LTR, swipe left (dx < 0) scrolls next (increases scrollX).
        let currentScrollX = currentRTL
          ? baseOffset + gestureState.dx
          : baseOffset - gestureState.dx;

        // Apply resistance if dragging past boundaries
        if (currentScrollX < 0) {
          currentScrollX = currentScrollX * 0.3;
        } else if (currentScrollX > 2 * currentWidth) {
          currentScrollX = 2 * currentWidth + (currentScrollX - 2 * currentWidth) * 0.3;
        }

        scrollX.setValue(currentScrollX);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { activeIndex: currentIdx, isRTL: currentRTL, windowWidth: currentWidth } = stateRef.current;
        
        const nextIndex = resolveNextIndex({
          activeIndex: currentIdx,
          isRTL: currentRTL,
          dx: gestureState.dx,
          vx: gestureState.vx,
          width: currentWidth,
          dy: gestureState.dy,
        });

        if (nextIndex === currentIdx) {
          isAnimating.current = true;
          Animated.spring(scrollX, {
            toValue: currentIdx * currentWidth,
            useNativeDriver: true,
            bounciness: 0,
          }).start(() => {
            isAnimating.current = false;
          });
        } else {
          setActiveIndex(nextIndex);
        }
      },
    })
  ).current;

  // 3. Handle Onboarding Completion (Skip or Get Started)
  const handleCompleteOnboarding = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await setOnboardingCompleted(true);
      router.replace("/(public)");
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert(
        t("common.errorTitle", "Error"),
        t("firstLaunchOnboarding.actions.writeFailed", "Could not save onboarding completion state. Please try again.")
      );
    }
  };

  // 4. Navigate to next slide or complete onboarding (with animation lock protection)
  const handleNext = () => {
    if (isAnimating.current || isSubmitting) return;
    if (activeIndex < 2) {
      setActiveIndex(activeIndex + 1);
    } else {
      void handleCompleteOnboarding();
    }
  };

  // 5. Render Redesigned Premium Vector Illustrations
  const renderIllustration = (index: number) => {
    const cardBg = isDark ? theme.colors.surfaceRaised : "#FFFFFF";
    
    if (index === 0) {
      // Slide 1: Calm specialist discovery composition
      return (
        <View style={styles.illustrationContainer}>
          {/* Subtle Ambient Glow */}
          <View style={[styles.glowCircle, { backgroundColor: theme.colors.mintAccent, opacity: 0.8 }]} />
          
          {/* Alternative Profile Layer 2 (Backmost) */}
          <View style={[styles.profileCardLayer, styles.profileCardBack2, { backgroundColor: cardBg, borderColor: theme.colors.border }]} />
          
          {/* Alternative Profile Layer 1 (Middle) */}
          <View style={[styles.profileCardLayer, styles.profileCardBack1, { backgroundColor: cardBg, borderColor: theme.colors.border }]} />
          
          {/* Primary Specialist Profile Surface (Frontmost) */}
          <View style={[styles.profileCardFront, { backgroundColor: cardBg, borderColor: theme.colors.border }]}>
            {/* Header with Avatar & Details */}
            <View style={styles.avatarRow}>
              <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primarySoft }]}>
                <Ionicons name="person" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.nameLines}>
                <View style={[styles.lineLong, { backgroundColor: theme.colors.textPrimary }]} />
                <View style={[styles.lineShort, { backgroundColor: theme.colors.textSecondary }]} />
              </View>
              
              {/* Clean selection match checkmark */}
              <View style={[styles.checkCircle, { backgroundColor: theme.colors.success }]}>
                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
              </View>
            </View>

            {/* Specialty filter hint */}
            <View style={styles.chipRow}>
              <View style={[styles.specialtyChip, { backgroundColor: theme.colors.mintAccent }]}>
                <Text style={styles.chipText} color={theme.colors.primary}>
                  {t("firstLaunchOnboarding.slides.0.chip", isRTL ? "مختص موثق" : "Verified specialist")}
                </Text>
              </View>
              <View style={[styles.specialtyChip, { backgroundColor: theme.colors.mintAccent }]}>
                <Text style={styles.chipText} color={theme.colors.primary}>
                  {t("firstLaunchOnboarding.slides.0.chip2", isRTL ? "الدعم النفسي" : "Mental wellbeing")}
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    }
    
    if (index === 1) {
      // Slide 2: Booking journey composition
      return (
        <View style={styles.illustrationContainer}>
          <View style={[styles.glowCircle, { backgroundColor: theme.colors.mintAccent, opacity: 0.8 }]} />
          
          {/* Booking Journey Card */}
          <View style={[styles.bookingCard, { backgroundColor: cardBg, borderColor: theme.colors.border }]}>
            {/* Calendar Selection (Selected Day) */}
            <View style={styles.calendarStrip}>
              <View style={[styles.calendarCell, { borderColor: theme.colors.border }]}>
                <Text variant="caption" color={theme.colors.textMuted}>{isRTL ? "ث" : "Tue"}</Text>
                <Text style={styles.cellDayNum} color={theme.colors.textSecondary}>25</Text>
              </View>
              <View style={[styles.calendarCell, styles.calendarCellSelected, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
                <Text variant="caption" color="#FFFFFF">{isRTL ? "أر" : "Wed"}</Text>
                <Text style={[styles.cellDayNum, { fontWeight: "700" }]} color="#FFFFFF">26</Text>
              </View>
              <View style={[styles.calendarCell, { borderColor: theme.colors.border }]}>
                <Text variant="caption" color={theme.colors.textMuted}>{isRTL ? "خ" : "Thu"}</Text>
                <Text style={styles.cellDayNum} color={theme.colors.textSecondary}>27</Text>
              </View>
            </View>

            {/* Time Slot Selection (Selected Time) */}
            <View style={styles.timeSlotRow}>
              <View style={[styles.timeSlotCell, { borderColor: theme.colors.border }]}>
                <Text style={styles.timeSlotText} color={theme.colors.textSecondary}>10:00 AM</Text>
              </View>
              <View style={[styles.timeSlotCell, styles.timeSlotCellSelected, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
                <Text style={[styles.timeSlotText, { fontWeight: "700" }]} color="#FFFFFF">06:00 PM</Text>
              </View>
            </View>

            {/* Confirmed Appointment Surface */}
            <View style={[styles.confirmedTicket, { backgroundColor: theme.colors.mintAccent }]}>
              <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
              <Text style={styles.confirmedText} color={theme.colors.primary}>
                {t("firstLaunchOnboarding.slides.1.confirmed", isRTL ? "متاح للحجز" : "Available to book")}
              </Text>
            </View>
          </View>
        </View>
      );
    }
    
    // Slide 3: Private care experience composition
    return (
      <View style={styles.illustrationContainer}>
        <View style={[styles.glowCircle, { backgroundColor: theme.colors.mintAccent, opacity: 0.8 }]} />
        
        {/* Calm Consultation Connection */}
        <View style={[styles.consultationWrapper, { backgroundColor: cardBg, borderColor: theme.colors.border }]}>
          <View style={styles.humanConnectionRow}>
            {/* Patient Circle */}
            <View style={[styles.userCircle, { backgroundColor: theme.colors.primarySoft }]}>
              <Ionicons name="person-outline" size={24} color={theme.colors.primary} />
            </View>

            {/* Connecting Wave Line */}
            <View style={styles.waveLineContainer}>
              <View style={[styles.connectingDot, { backgroundColor: theme.colors.primary, left: 10 }]} />
              <View style={[styles.connectingDot, { backgroundColor: theme.colors.primary, right: 10 }]} />
              <View style={[styles.waveBar, { backgroundColor: theme.colors.primarySoft }]} />
            </View>

            {/* Therapist Circle */}
            <View style={[styles.userCircle, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
            </View>
          </View>

          {/* Subtle Privacy Indicator */}
          <View style={[styles.privacyIndicator, { backgroundColor: theme.colors.creamAccent, borderColor: theme.colors.border }]}>
            <Ionicons name="lock-closed" size={12} color={theme.colors.primary} />
            <Text style={styles.privacyIndicatorText} color={theme.colors.textPrimary}>
              {t("firstLaunchOnboarding.slides.2.privacy", isRTL ? "خصوصيتك وأمان بياناتك أولوية" : "Your privacy and data security matter")}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const slidesData = [
    {
      title: t("firstLaunchOnboarding.slides.0.title", "Find the right specialist"),
      description: t(
        "firstLaunchOnboarding.slides.0.description",
        "Browse trusted specialists by expertise, language, and experience to find the right support for you."
      ),
    },
    {
      title: t("firstLaunchOnboarding.slides.1.title", "Book with confidence"),
      description: t(
        "firstLaunchOnboarding.slides.1.description",
        "Choose a suitable time and complete your booking through a simple and clear experience."
      ),
    },
    {
      title: t("firstLaunchOnboarding.slides.2.title", "Your privacy and data security matter"),
      description: t(
        "firstLaunchOnboarding.slides.2.description",
        "Your privacy is protected throughout your journey, from browsing to attending your session."
      ),
    },
  ];

  return (
    <Screen safeArea bg="background" style={styles.screen}>
      {/* Header Actions */}
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity
          onPress={handleCompleteOnboarding}
          disabled={isSubmitting}
          style={styles.skipButton}
          accessibilityRole="button"
          accessibilityLabel={t("firstLaunchOnboarding.actions.skip", "Skip")}
        >
          <Text color={theme.colors.textSecondary} variant="subtitle">
            {t("firstLaunchOnboarding.actions.skip", "Skip")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Controlled Pager Container */}
      <View style={styles.pagerContainer} {...panResponder.panHandlers}>
        {slidesData.map((slide, index) => {
          // Calculate interpolated horizontal translation for each slide overlay dynamically
          const translateX = scrollX.interpolate({
            inputRange: [0, 2 * windowWidth],
            outputRange: isRTL
              ? [-index * windowWidth, (2 - index) * windowWidth]
              : [index * windowWidth, (index - 2) * windowWidth],
          });

          return (
            <Animated.View
              key={index}
              pointerEvents={index === activeIndex ? "auto" : "none"}
              accessibilityElementsHidden={index !== activeIndex}
              importantForAccessibility={index === activeIndex ? "yes" : "no-hide-descendants"}
              style={[
                styles.slideWidthAbsolute,
                {
                  width: windowWidth,
                  transform: [{ translateX }],
                },
              ]}
            >
              {/* Upper visual composition focal point */}
              <View style={styles.artworkSection}>
                {renderIllustration(index)}
              </View>

              {/* Lower content section */}
              <View style={styles.contentSection}>
                <Text
                  variant="h1"
                  color={theme.colors.textPrimary}
                  style={[styles.slideTitle, { textAlign: isRTL ? "right" : "left" }]}
                >
                  {slide.title}
                </Text>
                <Text
                  variant="body"
                  color={theme.colors.textSecondary}
                  style={[styles.slideDescription, { textAlign: isRTL ? "right" : "left" }]}
                >
                  {slide.description}
                </Text>
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* Footer Navigation block */}
      <View style={[styles.footer, { paddingBottom: windowHeight < 700 ? 24 : 40 }]}>
        {/* Pagination dot indicators with screen reader support */}
        <View 
          style={[styles.pagination, { flexDirection: isRTL ? "row-reverse" : "row" }]}
          accessibilityRole="summary"
          accessibilityLabel={t("firstLaunchOnboarding.accessibility.pagination", "Slide {{current}} of {{total}}", {
            current: activeIndex + 1,
            total: 3
          })}
        >
          {slidesData.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === activeIndex ? theme.colors.primary : theme.colors.primarySoft,
                  width: i === activeIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Buttons section */}
        <View style={styles.actionContainer}>
          <PrimaryButton
            title={
              activeIndex === 2
                ? t("firstLaunchOnboarding.actions.getStarted", "Get Started")
                : t("firstLaunchOnboarding.actions.next", "Next")
            }
            onPress={handleNext}
            loading={isSubmitting}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={
              activeIndex === 2
                ? t("firstLaunchOnboarding.actions.getStarted", "Get Started")
                : t("firstLaunchOnboarding.actions.next", "Next")
            }
            rightIcon={
              activeIndex < 2 ? (
                <Ionicons
                  name={getDirectionalIcon("forward", isRTL)}
                  size={18}
                  color={theme.colors.onPrimary}
                />
              ) : undefined
            }
            style={styles.actionBtn}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    overflow: "hidden",
  },
  header: {
    height: 56,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    zIndex: 10,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 48,
    minWidth: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  pagerContainer: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  slideWidthAbsolute: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    alignItems: "center",
    justifyContent: "space-between",
  },
  artworkSection: {
    flex: 1.2,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  contentSection: {
    flex: 0.8,
    width: "100%",
    paddingHorizontal: 32,
    justifyContent: "flex-start",
  },
  slideTitle: {
    marginBottom: 12,
    fontWeight: "700",
  },
  slideDescription: {
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actionContainer: {
    width: "100%",
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 52,
  },
  
  // Illustration elements
  illustrationContainer: {
    width: 260,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glowCircle: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  
  // Slide 1 stacked profile cards
  profileCardLayer: {
    position: "absolute",
    width: 200,
    height: 110,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "solid",
  },
  profileCardBack2: {
    opacity: 0.25,
    transform: [{ rotate: "-6deg" }, { translateY: -15 }, { translateX: -8 }],
  },
  profileCardBack1: {
    opacity: 0.5,
    transform: [{ rotate: "4deg" }, { translateY: -8 }, { translateX: 6 }],
  },
  profileCardFront: {
    position: "absolute",
    width: 210,
    height: 125,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#24564F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nameLines: {
    flex: 1,
    gap: 4,
  },
  lineLong: {
    height: 6,
    borderRadius: 3,
    width: "60%",
  },
  lineShort: {
    height: 6,
    borderRadius: 3,
    width: "35%",
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: {
    flexDirection: "row",
    gap: 6,
  },
  specialtyChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 9,
    fontWeight: "600",
  },

  // Slide 2 Booking elements
  bookingCard: {
    width: 210,
    height: 150,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#24564F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  calendarStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarCell: {
    width: 44,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  calendarCellSelected: {
    shadowColor: "#24564F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 1,
  },
  cellDayNum: {
    fontSize: 12,
  },
  timeSlotRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  timeSlotCell: {
    flex: 1,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timeSlotCellSelected: {},
  timeSlotText: {
    fontSize: 10,
  },
  confirmedTicket: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confirmedText: {
    fontSize: 9,
    fontWeight: "700",
  },

  // Slide 3 Consultation elements
  consultationWrapper: {
    width: 220,
    height: 155,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#24564F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    justifyContent: "space-between",
  },
  humanConnectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  userCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#24564F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  waveLineContainer: {
    flex: 1,
    height: 16,
    justifyContent: "center",
    position: "relative",
    marginHorizontal: 8,
  },
  waveBar: {
    height: 2,
    width: "100%",
  },
  connectingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: "absolute",
  },
  privacyIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  privacyIndicatorText: {
    fontSize: 9,
    fontWeight: "600",
  },
});
