import React, { useMemo, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button, Card, Input, Screen, Text } from "../../../src/components/ui";
import { DialCodePickerModal } from "../../../src/features/auth/components/DialCodePickerModal";
import { DIAL_CODES, getCountryFlag } from "../../../src/features/auth/dial-codes";
import { extractApiErrorMessage } from "../../../src/lib/api";
import { useAuth } from "../../../src/providers/AuthProvider";
import { usePublicTheme } from "../../../src/features/public/theme/public-theme";
import { useAppDirection } from "../../../src/i18n/direction";
import { useTranslation } from "react-i18next";

const normalizeDigits = (value: string) =>
  value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776));

const validEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

export default function PatientSignUpScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { publicTheme } = usePublicTheme();
  const { isRTL, textAlign, arrowBack, arrowForward, rowDirection } = useAppDirection();
  const { signUpPatient } = useAuth();
  const logoAccessibilityLabel = isRTL ? "شعار سويّـة" : "Sawiyaa logo";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState("+20");
  const [countryCode, setCountryCode] = useState("EG");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => Boolean(displayName.trim()) && validEmail(email) && password.length >= 8 && password === confirmPassword,
    [displayName, email, password, confirmPassword]
  );
  const selectedCountry = DIAL_CODES.find((item) => item.dialCode === dialCode) ?? DIAL_CODES[0];

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const cleanPhone = normalizeDigits(phone).replace(/[\s()-]/g, "").trim();
      await signUpPatient({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        ...(cleanPhone ? { phone: cleanPhone, phoneCountryCode: countryCode } : {}),
      });
    } catch (submitError) {
      setError(extractApiErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen safeArea bg="background" style={[styles.screen, { backgroundColor: publicTheme.canvas }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Header Navigation Bar with RTL/LTR aware placement */}
          <View style={[styles.navHeader, { flexDirection: rowDirection }]}>
            <TouchableOpacity
              onPress={() => router.push("/(public)")}
              style={[styles.backButton, { backgroundColor: publicTheme.raisedSurface, borderColor: publicTheme.subtleBorder }]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isRTL ? "الرجوع للصفحة الرئيسية" : "Back to Home"}
            >
              <Ionicons name={arrowBack} size={18} color={publicTheme.primaryText} />
            </TouchableOpacity>

            <View style={styles.headerLogoContainer}>
              <Image
                source={require("../../../assets/logo_transparent.png")}
                style={styles.brandLogo}
                resizeMode="contain"
                accessible
                accessibilityRole="image"
                accessibilityLabel={logoAccessibilityLabel}
              />
            </View>

            <View style={styles.headerPlaceholder} />
          </View>

          {/* Main Card */}
          <Card
            variant="elevated"
            padding="lg"
            style={[
              styles.card,
              {
                backgroundColor: publicTheme.raisedSurface,
                borderColor: publicTheme.subtleBorder,
              },
            ]}
          >
            <View style={styles.headerBox}>
              <Text variant="h2" weight="bold" style={[styles.title, { color: publicTheme.primaryText, textAlign }]}>
                {t("auth.patientSignUp.title")}
              </Text>
              <Text variant="body" color={publicTheme.secondaryText} style={[styles.subtitle, { textAlign }]}>
                {t("auth.patientSignUp.subtitle")}
              </Text>
            </View>

            <Input
              autoCapitalize="words"
              label={t("auth.fields.displayName")}
              labelDirection={textAlign}
              placeholder={t("auth.placeholders.displayName")}
              placeholderDirection={textAlign}
              onChangeText={setDisplayName}
              value={displayName}
            />

            <Input
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label={t("auth.fields.email")}
              labelDirection={textAlign}
              placeholder={t("auth.placeholders.email")}
              placeholderDirection={textAlign}
              onChangeText={setEmail}
              value={email}
            />

            <View style={[styles.phoneRow, { flexDirection: rowDirection }]}>
              <TouchableOpacity
                onPress={() => setPickerOpen(true)}
                style={[
                  styles.dialButton,
                  {
                    backgroundColor: publicTheme.accentMint,
                    borderColor: publicTheme.subtleBorder,
                  },
                ]}
              >
                <Text style={styles.flag}>{getCountryFlag(selectedCountry.countryCode)}</Text>
                <Text style={[styles.dialCodeText, { color: publicTheme.primaryText }]}>{dialCode}</Text>
                <Ionicons name="chevron-down" size={14} color={publicTheme.primaryText} />
              </TouchableOpacity>
              <View style={styles.phoneInput}>
                <Input
                  keyboardType="phone-pad"
                  label={t("auth.patientSignUp.phoneOptional")}
                  labelDirection={textAlign}
                  placeholder={t("auth.placeholders.phone")}
                  placeholderDirection={textAlign}
                  onChangeText={setPhone}
                  value={phone}
                />
              </View>
            </View>

            <Input
              autoCapitalize="none"
              autoComplete="password"
              label={t("auth.fields.password")}
              labelDirection={textAlign}
              placeholder={t("auth.placeholders.password")}
              placeholderDirection={textAlign}
              secureTextEntry={!showPassword}
              onChangeText={setPassword}
              value={password}
              helperText={t("auth.validation.passwordHint")}
              rightElement={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={publicTheme.secondaryText} />
                </TouchableOpacity>
              }
            />

            <Input
              autoCapitalize="none"
              autoComplete="password"
              label={t("auth.fields.confirmPassword")}
              labelDirection={textAlign}
              placeholder={t("auth.placeholders.confirmPassword")}
              placeholderDirection={textAlign}
              secureTextEntry={!showConfirm}
              onChangeText={setConfirmPassword}
              value={confirmPassword}
              rightElement={
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeButton}>
                  <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={publicTheme.secondaryText} />
                </TouchableOpacity>
              }
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: "rgba(220, 38, 38, 0.08)" }]}>
                <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                <Text color="#DC2626" style={[styles.errorText, { textAlign }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            <Button
              title={submitting ? t("auth.common.pleaseWait") : t("auth.patientSignUp.submit")}
              onPress={() => void submit()}
              disabled={!canSubmit || submitting}
              rightIcon={<Ionicons name={arrowForward} size={16} color="#FFFFFF" />}
              style={[styles.primaryButton, { backgroundColor: publicTheme.primaryText }]}
            />

            <View style={[styles.footerRow, { flexDirection: rowDirection }]}>
              <Text color={publicTheme.secondaryText} style={{ fontSize: 13.5 }}>
                {t("auth.patientSignUp.haveAccount")}
              </Text>
              <TouchableOpacity onPress={() => router.replace("/(auth)/signin/patient")}>
                <Text style={[styles.linkText, { color: publicTheme.primaryText }]}>
                  {t("auth.patientSignUp.goToSignIn")}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <DialCodePickerModal
        visible={pickerOpen}
        value={dialCode}
        onClose={() => setPickerOpen(false)}
        onSelect={(code) => {
          const item = DIAL_CODES.find((entry) => entry.dialCode === code);
          setDialCode(code);
          if (item) setCountryCode(item.countryCode);
          setPickerOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
  },
  navHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    marginBottom: 2,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerLogoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogo: {
    width: 110,
    height: 34,
  },
  headerPlaceholder: {
    width: 36,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: "rgba(5, 63, 56, 0.08)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  headerBox: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 21,
    lineHeight: 28,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  phoneRow: {
    alignItems: "flex-start",
    gap: 10,
  },
  phoneInput: {
    flex: 1,
  },
  dialButton: {
    marginTop: 26,
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  flag: {
    fontSize: 16,
  },
  dialCodeText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12.5,
    flex: 1,
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 14,
    minHeight: 48,
    justifyContent: "center",
  },
  footerRow: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 14,
    flexWrap: "wrap",
  },
  linkText: {
    fontWeight: "800",
    textDecorationLine: "underline",
    fontSize: 13.5,
  },
  eyeButton: {
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
