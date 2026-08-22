import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { AuthScaffold } from "../../../src/components/auth/AuthScaffold";
import { Button, Input, Text } from "../../../src/components/ui";
import { useAuth } from "../../../src/providers/AuthProvider";
import { usePublicTheme } from "../../../src/features/public/theme/public-theme";
import { useAppDirection } from "../../../src/i18n/direction";
import { getAuthLockoutErrorMessage } from "../../../src/features/auth/auth-lockout-messages";

function validEmail(value: string) { return /\S+@\S+\.\S+/.test(value.trim()); }

export default function TraineeSignInScreen() {
  const router = useRouter();
  const { publicTheme } = usePublicTheme();
  const { t, i18n } = useTranslation();
  const { isRTL } = useAppDirection();
  const { signInTrainee } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const emailError = useMemo(() => email && !validEmail(email) ? t("auth.validation.email") : null, [email, t]);
  const isArabic = i18n.language?.startsWith("ar");

  async function submit() {
    setSubmitting(true); setErrorText(null);
    try { await signInTrainee({ email: email.trim(), password }); }
    catch (error) { setErrorText(getAuthLockoutErrorMessage(error, "trainee", t)); }
    finally { setSubmitting(false); }
  }

  return (
    <AuthScaffold
      eyebrow={isArabic ? "أكاديمية سويّة" : "Sawiyaa Academy"}
      title={isArabic ? "تسجيل دخول المتدرب" : "Trainee sign in"}
      subtitle={isArabic ? "تابع تدريباتك وحضورك وشهاداتك." : "Follow your trainings, attendance, and certificates."}
      onBackPress={() => router.push("/(public)")}
      footer={<TouchableOpacity onPress={() => router.replace("/(auth)")}><Text color={publicTheme.secondaryText} style={styles.backText}>{isArabic ? "الرجوع لاختيار المسار" : "Back to sign in options"}</Text></TouchableOpacity>}
    >
      <Input autoCapitalize="none" keyboardType="email-address" label={isArabic ? "البريد الإلكتروني" : "Email address"} value={email} onChangeText={setEmail} error={emailError ?? undefined} leftElement={<Ionicons name="mail-outline" size={19} color={publicTheme.secondaryText} />} />
      <Input autoCapitalize="none" secureTextEntry label={isArabic ? "كلمة المرور" : "Password"} value={password} onChangeText={setPassword} leftElement={<Ionicons name="lock-closed-outline" size={19} color={publicTheme.secondaryText} />} />
      {errorText ? <View style={styles.errorBox}><Text color="#DC2626" style={styles.errorText}>{errorText}</Text></View> : null}
      <Button title={submitting ? (isArabic ? "جارٍ الدخول..." : "Please wait...") : (isArabic ? "تسجيل الدخول" : "Sign in")} onPress={() => void submit()} disabled={submitting || !email || !password || Boolean(emailError)} style={[styles.primaryButton, { backgroundColor: publicTheme.primaryText }]} />
      {submitting ? <ActivityIndicator color={publicTheme.primaryText} /> : null}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  primaryButton: { borderRadius: 16, minHeight: 52, justifyContent: "center", marginBottom: 14 },
  errorBox: { backgroundColor: "rgba(220, 38, 38, 0.08)", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginBottom: 14 },
  errorText: { fontSize: 13 },
  backText: { fontSize: 13, textAlign: "center", textDecorationLine: "underline" },
});
