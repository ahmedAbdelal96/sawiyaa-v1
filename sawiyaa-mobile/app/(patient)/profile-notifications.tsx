import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Header,
  Screen,
  Card,
  Text,
  Button,
  ListRow,
  PreferenceToggleRow,
} from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import {
  useMySettings,
  useMySettingsNotificationPreferences,
  usePutMySettingsNotificationPreferences,
} from "../../src/features/settings/hooks";
import { useAppDirection } from "../../src/i18n/direction";
import { extractApiErrorMessage } from "../../src/lib/api";
import { Ionicons } from "@expo/vector-icons";

// ---------------------------------------------------------------------------
// Comprehensive Bilingual Notification Slug Map
// ---------------------------------------------------------------------------

const NOTIFICATION_TYPE_MAP: Record<string, { ar: string; en: string }> = {
  // Admin & Application Slugs
  "admin.practitioner-application-approved": {
    ar: "الموافقة على طلب انضمام المختص",
    en: "Practitioner Application Approved",
  },
  "admin.practitioner-application-changes-requested": {
    ar: "طلب تعديل بيانات طلب الانضمام",
    en: "Application Changes Requested",
  },
  "admin.practitioner-application-rejected": {
    ar: "رفض طلب انضمام المختص",
    en: "Practitioner Application Rejected",
  },
  "admin.practitioner-application-submitted": {
    ar: "تقديم طلب انضمام جديد",
    en: "Practitioner Application Submitted",
  },

  // Auth Slugs
  "auth.password-reset": {
    ar: "طلب إعادة تعيين كلمة المرور",
    en: "Password Reset Request",
  },
  "auth.patient-password-reset": {
    ar: "إعادة تعيين كلمة مرور المريض",
    en: "Patient Password Reset",
  },
  "auth.practitioner-password-reset": {
    ar: "إعادة تعيين كلمة مرور المختص",
    en: "Practitioner Password Reset",
  },
  "auth.practitioner-login-otp": {
    ar: "رمز التحقق لتسجيل دخول المختص",
    en: "Practitioner Login OTP Code",
  },
  "auth.patient-login-otp": {
    ar: "رمز التحقق لتسجيل دخول المريض",
    en: "Patient Login OTP Code",
  },
  "auth.login-otp": {
    ar: "رمز التحقق لتسجيل الدخول",
    en: "Login OTP Code",
  },
  "auth.verify-email": {
    ar: "تأكيد البريد الإلكتروني",
    en: "Email Verification",
  },

  // Sessions Slugs
  "sessions.session-confirmed": {
    ar: "تأكيد حجز الجلسة",
    en: "Session Booking Confirmed",
  },
  "sessions.session-confirmed-practitioner": {
    ar: "تأكيد حجز جلسة جديدة للمختص",
    en: "New Session Booking Confirmed",
  },
  "sessions.session-join-available": {
    ar: "الجلسة جاهزة للانضمام الآن",
    en: "Session Ready to Join",
  },
  "sessions.session-started": {
    ar: "بدء الجلسة الحالية",
    en: "Session Started",
  },
  "sessions.session-completed": {
    ar: "اكتمال الجلسة",
    en: "Session Completed",
  },
  "sessions.session-cancelled": {
    ar: "إلغاء الجلسة",
    en: "Session Cancelled",
  },
  "sessions.session-cancelled-practitioner": {
    ar: "إلغاء الجلسة من قبل المريض",
    en: "Session Cancelled by Patient",
  },
  "sessions.session-reminder": {
    ar: "تذكير بموعد الجلسة",
    en: "Upcoming Session Reminder",
  },
  "sessions.session-rescheduled": {
    ar: "تعديل موعد الجلسة",
    en: "Session Rescheduled",
  },

  // Messages Slugs
  "messages.session-message-received": {
    ar: "رسالة جديدة في محادثة الجلسة",
    en: "New Session Message",
  },
  "messages.support-message-received": {
    ar: "رسالة جديدة من فريق الدعم الفني",
    en: "Support Message Received",
  },
  "messages.follow-up-message-received": {
    ar: "رسالة متابعة جديدة",
    en: "New Follow-up Message",
  },

  // Payments Slugs
  "payments.payment-success": {
    ar: "نجاح عملية الدفع",
    en: "Payment Successful",
  },
  "payments.payment-captured": {
    ar: "تأكيد استلام المبلغ",
    en: "Payment Captured",
  },
  "payments.payment-failed": {
    ar: "فشل عملية الدفع",
    en: "Payment Failed",
  },
  "payments.refund-processed": {
    ar: "استرداد المبلغ إلى المحفظة",
    en: "Refund Processed",
  },

  // Account Slugs
  "account.security-alert": {
    ar: "تنبيه أمني للحساب",
    en: "Security Alert",
  },
  "account.profile-updated": {
    ar: "تحديث بيانات الملف الشخصي",
    en: "Profile Updated",
  },
};

// ---------------------------------------------------------------------------
// Smart Humanizer Fallback (translates English words into Arabic)
// ---------------------------------------------------------------------------

function smartHumanizeTypeSlug(typeSlug: string, isRtl: boolean): string {
  const clean = typeSlug.replace(/[\.-]/g, " ");

  if (!isRtl) {
    return clean
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Word replacements dictionary for Arabic fallback
  const wordMap: Record<string, string> = {
    admin: "إدارة",
    auth: "التوثيق",
    practitioner: "المختص",
    patient: "المريض",
    application: "طلب الانضمام",
    approved: "الموافقة على",
    changes: "تعديلات",
    requested: "مطلوبة",
    rejected: "مرفوض",
    submitted: "مُقدَّم",
    password: "كلمة المرور",
    reset: "إعادة تعيين",
    login: "تسجيل الدخول",
    otp: "رمز التحقق",
    session: "الجلسة",
    sessions: "الجلسات",
    message: "الرسالة",
    messages: "الرسائل",
    payment: "الدفع",
    payments: "المدفوعات",
    refund: "الاسترداد",
    verified: "مُوثَّق",
    verification: "التحقق",
  };

  let result = clean;
  Object.keys(wordMap).forEach((engWord) => {
    const regex = new RegExp(`\\b${engWord}\\b`, "gi");
    result = result.replace(regex, wordMap[engWord]);
  });

  return result.trim();
}

function getNotificationTypeLabel(typeSlug: string, isRtl: boolean): string {
  const mapped = NOTIFICATION_TYPE_MAP[typeSlug];
  if (mapped) {
    return isRtl ? mapped.ar : mapped.en;
  }

  return smartHumanizeTypeSlug(typeSlug, isRtl);
}

function getChannelLabel(channel: string, isRtl: boolean): string {
  switch (channel) {
    case "IN_APP":
      return isRtl ? "التنبيهات داخل التطبيق (Push Notifications)" : "In-App Push Notifications";
    case "EMAIL":
      return isRtl ? "البريد الإلكتروني" : "Email Notifications";
    case "SMS":
      return isRtl ? "الرسائل النصية (SMS)" : "SMS Notifications";
    default:
      return channel;
  }
}

// ---------------------------------------------------------------------------
// Screen Component
// ---------------------------------------------------------------------------

export default function PatientProfileNotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? true;

  const settingsQuery = useMySettings();
  const notificationPreferencesQuery = useMySettingsNotificationPreferences();
  const putNotificationPreferences = usePutMySettingsNotificationPreferences();

  const settings = settingsQuery.data?.item;
  const notificationPreferences =
    notificationPreferencesQuery.data?.item ??
    settings?.notificationPreferences;

  const [draft, setDraft] = useState<
    { typeSlug: string; channel: "IN_APP" | "EMAIL"; enabled: boolean }[]
  >([]);

  const { rowDirection } = useAppDirection();

  useEffect(() => {
    if (!notificationPreferences) {
      return;
    }

    setDraft(
      notificationPreferences.items.map((item) => ({
        typeSlug: item.typeSlug,
        channel: item.channel,
        enabled: item.enabled,
      })),
    );
  }, [notificationPreferences]);

  const supportedChannelsText = useMemo(() => {
    if (!notificationPreferences?.supportedChannels?.length) {
      return null;
    }

    return notificationPreferences.supportedChannels
      .map((c) => getChannelLabel(c, isRtl))
      .join(" • ");
  }, [notificationPreferences?.supportedChannels, isRtl]);

  // Group notifications dynamically based on prefix
  const categories = useMemo(() => {
    const groups: Record<string, typeof draft> = {};
    draft.forEach((item) => {
      let cat = "general";
      if (item.typeSlug.startsWith("sessions.")) {
        cat = "sessions";
      } else if (item.typeSlug.startsWith("messages.")) {
        cat = "messages";
      } else if (item.typeSlug.startsWith("payments.")) {
        cat = "payments";
      } else if (
        item.typeSlug.startsWith("admin.") ||
        item.typeSlug.startsWith("auth.") ||
        item.typeSlug.startsWith("account.")
      ) {
        cat = "account";
      }
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });
    return groups;
  }, [draft]);

  const save = async () => {
    try {
      await putNotificationPreferences.mutateAsync({ items: draft });
      Alert.alert(
        isRtl ? "تم الحفظ" : "Saved",
        isRtl ? "تم حفظ تفضيلات الإشعارات بنجاح." : "Notification preferences saved successfully.",
      );
    } catch (error) {
      Alert.alert(
        isRtl ? "فشل الحفظ" : "Save Failed",
        extractApiErrorMessage(error) ||
          (isRtl ? "تعذر حفظ التفضيلات. حاول مرة أخرى." : "Could not save notification preferences. Please try again."),
      );
    }
  };

  return (
    <Screen bg="background">
      <Header
        title={isRtl ? "تفضيلات الإشعارات" : "Notification Preferences"}
        showBack
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Inbox Link Card */}
        <Card
          variant="elevated"
          style={styles.inboxCard}
          padding="none"
        >
          <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.tertiary }]} />

          <View style={styles.rowPad}>
            <ListRow
              title={isRtl ? "مركز التنبيهات والإشعارات" : "Notification Center"}
              subtitle={
                isRtl
                  ? "عرض إشعارات الجلسات، التذكيرات والمستجدات الخاصة بك"
                  : "View all your session alerts, reminders, and updates"
              }
              leftElement={
                <View style={[styles.iconWrapper, { backgroundColor: theme.colors.primarySoft }]}>
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
              }
              onPress={() => router.push("/(patient)/notifications" as any)}
              showChevron
              style={{ flexDirection: rowDirection }}
            />
          </View>
        </Card>

        {!notificationPreferences || draft.length === 0 ? (
          <Card
            variant="elevated"
            style={styles.card}
            padding="none"
          >
            <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.tertiary }]} />
            <View style={styles.cardInnerPadding}>
              <Text weight="bold" style={styles.cardTitle} color={theme.colors.textPrimary}>
                {isRtl ? "إعدادات الإشعارات غير متاحة" : "Notification Settings Unavailable"}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.bodyText}>
                {isRtl
                  ? "تعذر تحميل إعدادات الإشعارات الحالية من الخادم."
                  : "Could not load current notification preferences from the server."}
              </Text>
              {supportedChannelsText ? (
                <Text color={theme.colors.textSecondary} style={styles.metaText}>
                  {isRtl
                    ? `القنوات المدعومة: ${supportedChannelsText}`
                    : `Supported Channels: ${supportedChannelsText}`}
                </Text>
              ) : null}
            </View>
          </Card>
        ) : (
          <>
            {Object.keys(categories).map((catKey) => {
              const catItems = categories[catKey];
              if (!catItems || catItems.length === 0) return null;

              let title = "";
              let subtitle = "";
              let iconName: keyof typeof Ionicons.glyphMap = "notifications-outline";
              let iconBgColor = theme.colors.mintAccent;
              let isWarmBackground = false;

              if (catKey === "sessions") {
                title = isRtl ? "إشعارات الجلسات والمواعيد" : "Sessions & Appointments";
                subtitle = isRtl
                  ? "تنبيهات تأكيد الحجز، التذكيرات وجاهزية الانضمام"
                  : "Alerts about booking confirmations, reminders, and join readiness";
                iconName = "calendar-outline";
                iconBgColor = theme.colors.mintAccent;
              } else if (catKey === "messages") {
                title = isRtl ? "المحادثات والرسائل" : "Chats & Messages";
                subtitle = isRtl
                  ? "تنبيهات استلام الرسائل من المعالجين أو الدعم الفني"
                  : "Alerts when you receive messages from practitioners or support";
                iconName = "chatbubbles-outline";
                iconBgColor = "#E8F1F8";
                isWarmBackground = true;
              } else if (catKey === "payments") {
                title = isRtl ? "المدفوعات والمحفظة" : "Payments & Wallet";
                subtitle = isRtl
                  ? "إشعارات الفواتير، استرداد الأموال وتأكيد الدفع"
                  : "Alerts for payment receipts, refunds, and wallet updates";
                iconName = "card-outline";
                iconBgColor = theme.colors.primarySoft;
              } else if (catKey === "account") {
                title = isRtl ? "الحساب والتوثيق" : "Account & Authentication";
                subtitle = isRtl
                  ? "إشعارات توثيق الدخول، كلمات المرور وتحديثات طلب الانضمام"
                  : "Alerts for login security, password reset, and application status";
                iconName = "shield-checkmark-outline";
                iconBgColor = theme.colors.primarySoft;
              } else {
                title = isRtl ? "تنبيهات عامة والنظام" : "General System Alerts";
                subtitle = isRtl
                  ? "تحديثات النظام وإشعارات الحساب العامة"
                  : "System updates and general alerts";
                iconName = "notifications-outline";
                iconBgColor = theme.colors.amberAccent;
              }

              return (
                <Card
                  key={catKey}
                  variant="elevated"
                  style={[
                    isWarmBackground ? styles.warmCard : styles.card,
                    isWarmBackground ? { backgroundColor: theme.colors.surface } : null
                  ]}
                  padding="none"
                >
                  <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.tertiary }]} />

                  <View style={styles.cardInnerPadding}>
                    <View style={[styles.catHeader, { flexDirection: rowDirection }]}>
                      <View style={[styles.iconWrapper, { backgroundColor: iconBgColor }]}>
                        <Ionicons name={iconName} size={20} color={theme.colors.primary} />
                      </View>
                      <View style={[styles.catTextWrap, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
                        <Text weight="bold" style={styles.catTitle} color={theme.colors.primary}>
                          {title}
                        </Text>
                        <Text color={theme.colors.textSecondary} style={styles.catSubtitle}>
                          {subtitle}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                    <View style={styles.listWrap}>
                      {catItems.map((item) => {
                        const draftIndex = draft.findIndex(
                          (d) => d.typeSlug === item.typeSlug && d.channel === item.channel
                        );

                        return (
                          <PreferenceToggleRow
                            key={`${item.typeSlug}-${item.channel}`}
                            title={getNotificationTypeLabel(item.typeSlug, isRtl)}
                            description={getChannelLabel(item.channel, isRtl)}
                            value={item.enabled}
                            onValueChange={(enabled) => {
                              if (draftIndex !== -1) {
                                setDraft((current) =>
                                  current.map((currentItem, currentIndex) =>
                                    currentIndex === draftIndex
                                      ? { ...currentItem, enabled }
                                      : currentItem,
                                  ),
                                );
                              }
                            }}
                            style={[styles.toggleRow, { flexDirection: rowDirection }]}
                          />
                        );
                      })}
                    </View>
                  </View>
                </Card>
              );
            })}

            <Button
              title={
                putNotificationPreferences.isPending
                  ? (isRtl ? "جاري الحفظ..." : "Saving...")
                  : (isRtl ? "حفظ التفضيلات" : "Save Preferences")
              }
              onPress={save}
              disabled={putNotificationPreferences.isPending}
              style={styles.saveButton}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 120,
    gap: 14,
  },
  card: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DED0",
    overflow: "hidden",
  },
  warmCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8DED0",
    overflow: "hidden",
  },
  inboxCard: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DED0",
    overflow: "hidden",
  },
  goldAccentLine: {
    height: 3,
    width: "100%",
  },
  cardInnerPadding: {
    padding: 16,
    gap: 12,
  },
  rowPad: {
    paddingHorizontal: 16,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  metaText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },
  catHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  catTextWrap: {
    flex: 1,
  },
  catTitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  catSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
  listWrap: {
    gap: 4,
  },
  toggleRow: {
    borderBottomWidth: 0,
    paddingVertical: 10,
  },
  saveButton: {
    height: 50,
    borderRadius: 14,
    marginTop: 6,
  },
});
