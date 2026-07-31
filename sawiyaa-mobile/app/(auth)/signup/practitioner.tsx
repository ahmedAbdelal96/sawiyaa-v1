import React, { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input, Screen, Text, OtpInput } from "../../../src/components/ui";
import { DialCodePickerModal } from "../../../src/features/auth/components/DialCodePickerModal";
import { DIAL_CODES, getCountryFlag } from "../../../src/features/auth/dial-codes";
import { listSpecialties, listSpecialtyCategories } from "../../../src/features/auth/api";
import type { Specialty, SpecialtyCategory, PractitionerRegistrationResponse } from "../../../src/features/auth/contracts";
import { extractApiErrorMessage } from "../../../src/lib/api";
import { useAuth } from "../../../src/providers/AuthProvider";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";

const normalizeDigits = (value: string) => value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
const validEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

export default function PractitionerSignUpScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { startPractitionerRegistration, verifyPractitionerRegistrationOtp, resendPractitionerRegistrationOtp } = useAuth();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const align = isRtl ? "right" : "left";
  const [step, setStep] = useState<"form" | "otp">("form");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState("+20");
  const [countryCode, setCountryCode] = useState("EG");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [specialtyId, setSpecialtyId] = useState<string | null>(null);
  const [categories, setCategories] = useState<SpecialtyCategory[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [picker, setPicker] = useState<"category" | "specialty" | null>(null);
  const [dialPicker, setDialPicker] = useState(false);
  const [challenge, setChallenge] = useState<PractitionerRegistrationResponse | null>(null);
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void Promise.all([listSpecialtyCategories(), listSpecialties()]).then(([cat, spec]) => { setCategories(cat.categories); setSpecialties(spec.specialties); }).catch(() => setError(t("auth.practitionerSignUp.catalogError"))); }, [t]);
  const selectedCategory = categories.find((item) => item.id === categoryId);
  const selectedSpecialty = specialties.find((item) => item.id === specialtyId);
  const canSubmit = Boolean(displayName.trim()) && validEmail(email) && password.length >= 8 && password === confirmPassword && Boolean(categoryId) && Boolean(specialtyId);
  const selectedCountry = DIAL_CODES.find((item) => item.dialCode === dialCode) ?? DIAL_CODES[0];
  const pickerItems = useMemo(() => picker === "category" ? categories : specialties, [categories, picker, specialties]);

  async function start() {
    if (!canSubmit || submitting) return;
    setSubmitting(true); setError(null);
    try {
      const cleanPhone = normalizeDigits(phone).replace(/[\s()-]/g, "").trim();
      const response = await startPractitionerRegistration({ email: email.trim(), password, displayName: displayName.trim(), countryCode, primarySpecialtyCategoryId: categoryId!, specialtyIds: [specialtyId!], ...(cleanPhone ? { phone: cleanPhone, phoneCountryCode: countryCode } : {}) });
      setChallenge(response); setStep("otp");
    } catch (submitError) { setError(extractApiErrorMessage(submitError)); } finally { setSubmitting(false); }
  }

  async function verify() {
    if (!challenge?.challengeId || otp.trim().length < 4 || submitting) return;
    setSubmitting(true); setError(null);
    try {
      await verifyPractitionerRegistrationOtp({ challengeId: challenge.challengeId, code: normalizeDigits(otp).trim() });
      setOtp("");
      setChallenge(null);
      setPassword("");
      setConfirmPassword("");
      router.replace("/(auth)/signup/practitioner-success");
    }
    catch (verifyError) { setError(extractApiErrorMessage(verifyError)); } finally { setSubmitting(false); }
  }

  async function resend() {
    if (!challenge?.challengeId || submitting) return;
    setSubmitting(true); setError(null);
    try { setChallenge(await resendPractitionerRegistrationOtp(challenge.challengeId)); }
    catch (resendError) { setError(extractApiErrorMessage(resendError)); } finally { setSubmitting(false); }
  }

  if (step === "otp") return <Screen safeArea bg="background" style={styles.screen}><View style={styles.otpCard}><Text style={styles.title} weight="bold">{t("auth.practitionerSignUp.otpTitle")}</Text><Text style={styles.subtitle} color={theme.colors.textSecondary}>{t("auth.practitionerSignUp.otpBody", { email: challenge?.maskedTarget ?? email })}</Text><OtpInput value={otp} onChangeText={setOtp} length={6} disabled={submitting} label={t("auth.practitionerSignUp.otpLabel")} /><Text style={styles.expiry} color={theme.colors.textMuted}>{t("auth.practitionerSignUp.otpExpiry")}</Text>{error ? <Text color={theme.colors.error} style={styles.errorText}>{error}</Text> : null}<Button title={submitting ? t("auth.common.pleaseWait") : t("auth.practitionerSignUp.verify")} onPress={() => void verify()} disabled={submitting || otp.trim().length < 6} /><TouchableOpacity onPress={() => void resend()} disabled={submitting} style={styles.resend}><Text color={theme.colors.primary} weight="600">{t("auth.practitionerSignUp.resend")}</Text></TouchableOpacity><TouchableOpacity onPress={() => { setStep("form"); setError(null); }}><Text color={theme.colors.textMuted} style={styles.back}>{t("auth.practitionerSignUp.editEmail")}</Text></TouchableOpacity></View></Screen>;

  return <Screen safeArea bg="background" style={styles.screen}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={[styles.brand, { backgroundColor: theme.colors.primaryLight }]}><Ionicons name="water" size={16} color={theme.colors.primary} /><Text color={theme.colors.primary} weight="600">Sawiyaa</Text></View><View style={[styles.card, { backgroundColor: theme.colors.surface }]}><Text style={styles.title} weight="bold">{t("auth.practitionerSignUp.title")}</Text><Text style={styles.subtitle} color={theme.colors.textSecondary}>{t("auth.practitionerSignUp.emailHint")}</Text><Input autoCapitalize="words" label={t("auth.fields.displayName")} labelDirection={align} value={displayName} onChangeText={setDisplayName} /><Input autoCapitalize="none" keyboardType="email-address" label={t("auth.fields.email")} labelDirection={align} value={email} onChangeText={setEmail} /><View style={styles.phoneRow}><TouchableOpacity onPress={() => setDialPicker(true)} style={[styles.dialButton, { borderColor: theme.colors.borderLight, backgroundColor: theme.colors.surfaceTertiary }]}><Text style={styles.flag}>{getCountryFlag(selectedCountry.countryCode)}</Text><Text>{dialCode}</Text></TouchableOpacity><View style={styles.phoneInput}><Input keyboardType="phone-pad" label={t("auth.practitionerSignUp.phoneOptional")} labelDirection={align} value={phone} onChangeText={setPhone} /></View></View><PickerButton label={t("auth.practitionerSignUp.category")} value={selectedCategory?.name ?? t("auth.practitionerSignUp.selectCategory")} onPress={() => setPicker("category")} /><PickerButton label={t("auth.practitionerSignUp.specialty")} value={selectedSpecialty?.name ?? t("auth.practitionerSignUp.selectSpecialty")} onPress={() => setPicker("specialty")} /><Input autoCapitalize="none" secureTextEntry label={t("auth.fields.password")} labelDirection={align} value={password} onChangeText={setPassword} helperText={t("auth.validation.passwordHint")} /><Input autoCapitalize="none" secureTextEntry label={t("auth.fields.confirmPassword")} labelDirection={align} value={confirmPassword} onChangeText={setConfirmPassword} />{error ? <Text color={theme.colors.error} style={styles.errorText}>{error}</Text> : null}<Button title={submitting ? t("auth.common.pleaseWait") : t("auth.practitionerSignUp.submit")} onPress={() => void start()} disabled={!canSubmit || submitting} /><TouchableOpacity onPress={() => router.replace("/(auth)/signin/practitioner")}><Text color={theme.colors.textMuted} style={styles.back}>{t("auth.common.backToPractitionerSignIn")}</Text></TouchableOpacity></View></ScrollView></KeyboardAvoidingView><DialCodePickerModal visible={dialPicker} value={dialCode} onClose={() => setDialPicker(false)} onSelect={(code) => { const item = DIAL_CODES.find((entry) => entry.dialCode === code); setDialCode(code); if (item) setCountryCode(item.countryCode); setDialPicker(false); }} /><Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}><View style={styles.modalBackdrop}><View style={[styles.modal, { backgroundColor: theme.colors.surface }]}><Text style={styles.modalTitle} weight="bold">{picker === "category" ? t("auth.practitionerSignUp.category") : t("auth.practitionerSignUp.specialty")}</Text><ScrollView>{pickerItems.map((item) => <TouchableOpacity key={item.id} style={styles.option} onPress={() => { if (picker === "category") setCategoryId(item.id); else setSpecialtyId(item.id); setPicker(null); }}><Text>{item.name ?? ""}</Text></TouchableOpacity>)}</ScrollView></View></View></Modal></Screen>;
}

function PickerButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) { const { theme } = useTheme(); return <TouchableOpacity onPress={onPress} style={[styles.pickerButton, { borderColor: theme.colors.borderLight }]}><Text color={theme.colors.textMuted} style={styles.pickerLabel}>{label}</Text><View style={styles.pickerValue}><Text>{value}</Text><Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} /></View></TouchableOpacity>; }

const styles = StyleSheet.create({ flex: { flex: 1 }, screen: { paddingHorizontal: 24 }, content: { flexGrow: 1, justifyContent: "center", paddingVertical: 24 }, brand: { alignSelf: "center", flexDirection: "row", gap: 8, alignItems: "center", padding: 8, borderRadius: 10, marginBottom: 12 }, card: { borderRadius: 20, padding: 22 }, otpCard: { flex: 1, justifyContent: "center" }, title: { textAlign: "center", fontSize: 22, marginBottom: 8 }, subtitle: { textAlign: "center", marginBottom: 20, lineHeight: 20 }, phoneRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" }, phoneInput: { flex: 1 }, dialButton: { marginTop: 26, minHeight: 56, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 4, alignItems: "center" }, flag: { fontSize: 18 }, pickerButton: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 }, pickerLabel: { fontSize: 12, marginBottom: 5 }, pickerValue: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, errorText: { marginBottom: 12, textAlign: "center" }, expiry: { textAlign: "center", marginBottom: 16 }, resend: { alignItems: "center", marginTop: 18 }, back: { textAlign: "center", marginTop: 16 }, modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.4)" }, modal: { maxHeight: "70%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }, modalTitle: { fontSize: 18, marginBottom: 12 }, option: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#ddd" },
});
