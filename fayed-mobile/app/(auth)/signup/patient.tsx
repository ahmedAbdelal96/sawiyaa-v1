import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input, Screen, Text } from "../../../src/components/ui";
import { useAuth } from "../../../src/providers/AuthProvider";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { extractApiErrorMessage } from "../../../src/lib/api";
import { DialCodePickerModal } from "../../../src/features/auth/components/DialCodePickerModal";

function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email.trim());
}

function validatePhoneNumber(phone: string) {
  return /^\d{7,15}$/.test(phone.replace(/\s|-/g, ""));
}

type Step = 1 | 2;

export default function PatientSignUpScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const { signUpPatient } = useAuth();

  const [step, setStep] = useState<Step>(1);

  // Step 1 fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [dialCode, setDialCode] = useState<string>("+20");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Step 2 fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Shared state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Dial picker
  const [showDialPicker, setShowDialPicker] = useState(false);

  // Step 1 validations
  const displayNameError = useMemo(() => {
    if (!displayName) return null;
    return displayName.trim() ? null : t("auth.validation.displayNameRequired");
  }, [displayName, t]);

  const emailError = useMemo(() => {
    if (!email) return null;
    return validateEmail(email) ? null : t("auth.validation.email");
  }, [email, t]);

  const phoneError = useMemo(() => {
    if (!phoneNumber) return null;
    return validatePhoneNumber(phoneNumber) ? null : t("auth.validation.phoneFormat");
  }, [phoneNumber, t]);

  const isStep1Valid = useMemo(() => {
    return (
      Boolean(displayName.trim()) &&
      validateEmail(email) &&
      Boolean(phoneNumber) &&
      validatePhoneNumber(phoneNumber)
    );
  }, [displayName, email, phoneNumber]);

  // Step 2 validations
  const passwordError = useMemo(() => {
    if (!password) return null;
    return password.length >= 8 ? null : t("auth.validation.passwordLength");
  }, [password, t]);

  const confirmPasswordError = useMemo(() => {
    if (!confirmPassword) return null;
    return confirmPassword === password
      ? null
      : t("auth.validation.confirmPasswordMismatch");
  }, [confirmPassword, password, t]);

  const isStep2Valid = useMemo(() => {
    return (
      password.length >= 8 &&
      Boolean(confirmPassword) &&
      password === confirmPassword
    );
  }, [password, confirmPassword]);

  function buildFullPhone() {
    const clean = phoneNumber.replace(/\s|-/g, "");
    return `${dialCode}${clean}`;
  }

  function handleNext() {
    if (!isStep1Valid) return;
    setErrorText(null);
    setStep(2);
  }

  function handleBack() {
    setStep(1);
    setErrorText(null);
  }

  async function handleSubmit() {
    if (!isStep2Valid) return;
    setIsSubmitting(true);
    setErrorText(null);
    try {
      await signUpPatient({
        displayName: displayName.trim(),
        email: email.trim(),
        phone: buildFullPhone(),
        password,
      });
    } catch (error) {
      setErrorText(extractApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const labelAlign = isRtl ? "right" : "left";

  return (
    <Screen safeArea bg="background" style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Row */}
          <View style={styles.brandRow}>
            <View style={[styles.brandIcon, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="water" size={16} color={theme.colors.primary} />
            </View>
            <Text style={[styles.brandName, { color: theme.colors.primary }]} weight="600">
              Sawiyaa
            </Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text
                style={styles.title}
                color={theme.colors.textPrimary}
                weight="bold"
              >
                {t("auth.patientSignUp.title")}
              </Text>
              <Text
                style={styles.subtitle}
                color={theme.colors.textSecondary}
              >
                {t("auth.patientSignUp.subtitle")}
              </Text>
              {/* Step indicator */}
              <View style={styles.stepRow}>
                <Text
                  style={styles.stepText}
                  color={theme.colors.primary}
                  weight="600"
                >
                  {step === 1
                    ? t("auth.patientSignUp.step1Label")
                    : t("auth.patientSignUp.step2Label")}
                </Text>
              </View>
            </View>

            {/* ─── STEP 1 ─── */}
            {step === 1 && (
              <>
                <Input
                  autoCapitalize="words"
                  label={t("auth.fields.displayName")}
                  labelDirection={labelAlign}
                  placeholder={t("auth.placeholders.displayName")}
                  placeholderDirection={labelAlign}
                  onChangeText={(val) => {
                    setDisplayName(val);
                    if (displayNameError) setErrorText(null);
                  }}
                  value={displayName}
                  error={displayNameError ?? undefined}
                />
                <Input
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  label={t("auth.fields.email")}
                  labelDirection={labelAlign}
                  placeholder={t("auth.placeholders.email")}
                  placeholderDirection="left"
                  onChangeText={(val) => {
                    setEmail(val);
                    if (emailError) setErrorText(null);
                  }}
                  value={email}
                  error={emailError ?? undefined}
                />

                {/* Phone with dial code */}
                <View style={styles.phoneRow}>
                  {/* Dial code selector */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowDialPicker(true)}
                    style={[
                      styles.dialButton,
                      {
                        backgroundColor: theme.colors.surfaceTertiary,
                        borderColor: theme.colors.borderLight,
                      },
                    ]}
                  >
                    <Text
                      style={{ fontSize: 15, color: theme.colors.textPrimary }}
                      weight="500"
                    >
                      {dialCode}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={14}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>

                  {/* Phone number input */}
                  <View style={{ flex: 1 }}>
                    <Input
                      keyboardType="phone-pad"
                      label={t("auth.fields.phone")}
                      labelDirection={labelAlign}
                      placeholder={t("auth.placeholders.phone")}
                      placeholderDirection="left"
                      onChangeText={(val) => {
                        setPhoneNumber(val);
                        if (phoneError) setErrorText(null);
                      }}
                      value={phoneNumber}
                      error={phoneError ?? undefined}
                    />
                  </View>
                </View>

                {/* Error */}
                {errorText ? (
                  <View style={[styles.errorBox, { backgroundColor: theme.colors.errorLight }]}>
                    <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                    <Text style={[styles.errorText, { textAlign: labelAlign }]} color={theme.colors.error}>
                      {errorText}
                    </Text>
                  </View>
                ) : null}

                {/* Next Button */}
                <Button
                  title={t("auth.patientSignUp.next")}
                  onPress={() => void handleNext()}
                  disabled={!isStep1Valid}
                  style={styles.primaryButton}
                />
              </>
            )}

            {/* ─── STEP 2 ─── */}
            {step === 2 && (
              <>
                <Input
                  autoCapitalize="none"
                  autoComplete="password"
                  label={t("auth.fields.password")}
                  labelDirection={labelAlign}
                  placeholder={t("auth.placeholders.password")}
                  placeholderDirection="left"
                  secureTextEntry={!showPassword}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (passwordError) setErrorText(null);
                  }}
                  value={password}
                  error={passwordError ?? undefined}
                  helperText={passwordError ? undefined : t("auth.validation.passwordHint")}
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setShowPassword((v) => !v)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color={theme.colors.textMuted}
                      />
                    </TouchableOpacity>
                  }
                />
                <Input
                  autoCapitalize="none"
                  autoComplete="password"
                  label={t("auth.fields.confirmPassword")}
                  labelDirection={labelAlign}
                  placeholder={t("auth.placeholders.confirmPassword")}
                  placeholderDirection="left"
                  secureTextEntry={!showConfirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (confirmPasswordError) setErrorText(null);
                  }}
                  value={confirmPassword}
                  error={confirmPasswordError ?? undefined}
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword((v) => !v)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={20}
                        color={theme.colors.textMuted}
                      />
                    </TouchableOpacity>
                  }
                />

                {/* Pricing note */}
                <View style={[styles.pricingNote, { backgroundColor: theme.colors.surfaceTertiary }]}>
                  <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
                  <Text
                    style={[styles.pricingNoteText, { color: theme.colors.textMuted }]}
                  >
                    {t("auth.patientSignUp.pricingNote")}
                  </Text>
                </View>

                {/* Error */}
                {errorText ? (
                  <View style={[styles.errorBox, { backgroundColor: theme.colors.errorLight }]}>
                    <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                    <Text style={[styles.errorText, { textAlign: labelAlign }]} color={theme.colors.error}>
                      {errorText}
                    </Text>
                  </View>
                ) : null}

                {/* Submit Button */}
                <Button
                  title={
                    isSubmitting
                      ? t("auth.common.pleaseWait")
                      : t("auth.patientSignUp.submit")
                  }
                  onPress={() => void handleSubmit()}
                  disabled={isSubmitting || !isStep2Valid}
                  style={styles.primaryButton}
                />

                {/* Back link */}
                <TouchableOpacity
                  onPress={handleBack}
                  activeOpacity={0.7}
                  style={styles.backRow}
                >
                  <Ionicons
                    name={isRtl ? "chevron-forward" : "chevron-back"}
                    size={18}
                    color={theme.colors.primary}
                  />
                  <Text color={theme.colors.primary} weight="500">
                    {t("auth.patientSignUp.back")}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Bottom Link */}
            <View style={styles.rowWrap}>
              <Text color={theme.colors.textSecondary}>
                {t("auth.patientSignUp.haveAccount")}
              </Text>
              <TouchableOpacity onPress={() => router.replace("/(auth)/signin/patient")}>
                <Text color={theme.colors.primary} weight="600">
                  {t("auth.patientSignUp.goToSignIn")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {isSubmitting && step === 2 && (
            <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Dial code picker */}
      <DialCodePickerModal
        visible={showDialPicker}
        value={dialCode}
        onClose={() => setShowDialPicker(false)}
        onSelect={(code) => {
          setDialCode(code);
          setShowDialPicker(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 24,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
    gap: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 4,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 18,
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  stepRow: {
    marginTop: 12,
    alignItems: "center",
  },
  stepText: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  dialButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginTop: 26,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  primaryButton: {
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 16,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 8,
  },
  rowWrap: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  loader: {
    marginTop: 8,
  },
  eyeButton: {
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  pricingNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  pricingNoteText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});
