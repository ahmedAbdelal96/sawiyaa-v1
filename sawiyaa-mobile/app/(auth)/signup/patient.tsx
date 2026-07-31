import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button, Input, Screen, Text } from "../../../src/components/ui";
import { DialCodePickerModal } from "../../../src/features/auth/components/DialCodePickerModal";
import { DIAL_CODES, getCountryFlag } from "../../../src/features/auth/dial-codes";
import { extractApiErrorMessage } from "../../../src/lib/api";
import { useAuth } from "../../../src/providers/AuthProvider";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";

const normalizeDigits = (value: string) =>
  value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776));

const validEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

export default function PatientSignUpScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { signUpPatient } = useAuth();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const align = isRtl ? "right" : "left";
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

  const canSubmit = useMemo(() => Boolean(displayName.trim()) && validEmail(email) && password.length >= 8 && password === confirmPassword, [displayName, email, password, confirmPassword]);
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
    <Screen safeArea bg="background" style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.brand, { backgroundColor: theme.colors.primaryLight }]}><Ionicons name="water" size={16} color={theme.colors.primary} /><Text color={theme.colors.primary} weight="600">Sawiyaa</Text></View>
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.title} weight="bold">{t("auth.patientSignUp.title")}</Text>
            <Text style={styles.subtitle} color={theme.colors.textSecondary}>{t("auth.patientSignUp.subtitle")}</Text>
            <Input autoCapitalize="words" label={t("auth.fields.displayName")} labelDirection={align} placeholder={t("auth.placeholders.displayName")} onChangeText={setDisplayName} value={displayName} />
            <Input autoCapitalize="none" autoComplete="email" keyboardType="email-address" label={t("auth.fields.email")} labelDirection={align} placeholder={t("auth.placeholders.email")} onChangeText={setEmail} value={email} />
            <View style={styles.phoneRow}>
              <TouchableOpacity onPress={() => setPickerOpen(true)} style={[styles.dialButton, { backgroundColor: theme.colors.surfaceTertiary, borderColor: theme.colors.borderLight }]}>
                <Text style={styles.flag}>{getCountryFlag(selectedCountry.countryCode)}</Text><Text>{dialCode}</Text><Ionicons name="chevron-down" size={14} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <View style={styles.phoneInput}><Input keyboardType="phone-pad" label={t("auth.patientSignUp.phoneOptional")} labelDirection={align} placeholder={t("auth.placeholders.phone")} onChangeText={setPhone} value={phone} /></View>
            </View>
            <Input autoCapitalize="none" autoComplete="password" label={t("auth.fields.password")} labelDirection={align} placeholder={t("auth.placeholders.password")} secureTextEntry={!showPassword} onChangeText={setPassword} value={password} helperText={t("auth.validation.passwordHint")} rightElement={<TouchableOpacity onPress={() => setShowPassword(!showPassword)}><Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={theme.colors.textMuted} /></TouchableOpacity>} />
            <Input autoCapitalize="none" autoComplete="password" label={t("auth.fields.confirmPassword")} labelDirection={align} placeholder={t("auth.placeholders.confirmPassword")} secureTextEntry={!showConfirm} onChangeText={setConfirmPassword} value={confirmPassword} rightElement={<TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}><Ionicons name={showConfirm ? "eye-off" : "eye"} size={20} color={theme.colors.textMuted} /></TouchableOpacity>} />
            {error ? <View style={[styles.error, { backgroundColor: theme.colors.errorLight }]}><Text color={theme.colors.error} style={{ textAlign: align }}>{error}</Text></View> : null}
            <Button title={submitting ? t("auth.common.pleaseWait") : t("auth.patientSignUp.submit")} onPress={() => void submit()} disabled={!canSubmit || submitting} style={styles.button} />
            <View style={styles.footer}><Text color={theme.colors.textSecondary}>{t("auth.patientSignUp.haveAccount")}</Text><TouchableOpacity onPress={() => router.replace("/(auth)/signin/patient")}><Text color={theme.colors.primary} weight="600">{t("auth.patientSignUp.goToSignIn")}</Text></TouchableOpacity></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <DialCodePickerModal visible={pickerOpen} value={dialCode} onClose={() => setPickerOpen(false)} onSelect={(code) => { const item = DIAL_CODES.find((entry) => entry.dialCode === code); setDialCode(code); if (item) setCountryCode(item.countryCode); setPickerOpen(false); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, screen: { paddingHorizontal: 24 }, content: { flexGrow: 1, justifyContent: "center", paddingVertical: 24 }, brand: { alignSelf: "center", flexDirection: "row", gap: 8, alignItems: "center", padding: 8, borderRadius: 10, marginBottom: 12 }, card: { borderRadius: 20, padding: 22 }, title: { textAlign: "center", fontSize: 22, marginBottom: 6 }, subtitle: { textAlign: "center", marginBottom: 20 }, phoneRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 }, phoneInput: { flex: 1 }, dialButton: { marginTop: 26, minHeight: 56, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 4 }, flag: { fontSize: 18 }, error: { padding: 10, borderRadius: 8, marginBottom: 12 }, button: { marginTop: 4 }, footer: { flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 18 },
});
