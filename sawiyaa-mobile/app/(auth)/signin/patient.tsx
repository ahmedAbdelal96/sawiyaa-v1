import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { PatientGoogleSignInButton } from "../../../src/components/auth/PatientGoogleSignInButton";
import { AuthScaffold } from "../../../src/components/auth/AuthScaffold";
import { Button, Input, Text } from "../../../src/components/ui";
import { useAuth } from "../../../src/providers/AuthProvider";
import { usePublicTheme } from "../../../src/features/public/theme/public-theme";
import { useAppDirection } from "../../../src/i18n/direction";
import { getAuthLockoutErrorMessage } from "../../../src/features/auth/auth-lockout-messages";

function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email.trim());
}

const DEV_ACCOUNTS: Array<{ label: string; email: string; password: string }> = __DEV__
  ? [
      {
        label: "👤 مريض تجريبي",
        email: "ahmed.patient@hesba.local",
        password: "Patient@12345",
      },
    ]
  : [];

export default function PatientSignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    redirect?: string;
    redirectIntent?: string;
  }>();
  const redirectAfterLogin = params.redirect || null;
  const { publicTheme } = usePublicTheme();
  const { t, i18n } = useTranslation();
  const { isRTL } = useAppDirection();
  const { signInPatient, signInPatientWithGoogle, setPendingRedirect } =
    useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const isArabic = i18n.language?.startsWith("ar");
  const eyebrow = isArabic
    ? "✨ مرحباً بك مجدداً في سويّة"
    : t("auth.patientSignIn.eyebrow", { defaultValue: "Welcome back" });
  const title = t("auth.patientSignIn.title", {
    defaultValue: isArabic ? "تسجيل الدخول كمريض" : "Sign In to Your Account",
  });
  const subtitle = t("brand.tagline", {
    defaultValue: isArabic
      ? "رعاية متكاملة للعقل والجسم والتوازن النفسي"
      : "Care for mind, body, and balance",
  });

  const emailError = useMemo(() => {
    if (!email) return null;
    return validateEmail(email) ? null : t("auth.validation.email");
  }, [email, t]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorText(null);
    try {
      if (redirectAfterLogin) {
        setPendingRedirect(redirectAfterLogin);
      }
      await signInPatient({ email: email.trim(), password });
    } catch (error) {
      setPendingRedirect(null);
      setErrorText(getAuthLockoutErrorMessage(error, "patient", t));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScaffold
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      onBackPress={() => router.push("/(public)")}
      footer={
        <TouchableOpacity onPress={() => router.replace("/(auth)")}>
          <Text color={publicTheme.secondaryText} style={styles.backText}>
            {t("auth.common.backToEntry", {
              defaultValue: isArabic
                ? "الرجوع لاختيار مسار الدخول"
                : "Back to sign in options",
            })}
          </Text>
        </TouchableOpacity>
      }
    >
      {/* Email Input */}
      <Input
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label={t("auth.fields.email", {
          defaultValue: isArabic ? "البريد الإلكتروني" : "Email address",
        })}
        onChangeText={setEmail}
        placeholder={t("auth.placeholders.email", {
          defaultValue: "patient@domain.com",
        })}
        value={email}
        error={emailError ?? undefined}
        leftElement={
          <Ionicons
            name="mail-outline"
            size={19}
            color={publicTheme.secondaryText}
          />
        }
      />

      {/* Password Input */}
      <Input
        autoCapitalize="none"
        autoComplete="password"
        label={t("auth.fields.password", {
          defaultValue: isArabic ? "كلمة المرور" : "Password",
        })}
        placeholder={t("auth.placeholders.password", {
          defaultValue: "••••••••••••",
        })}
        secureTextEntry={!showPassword}
        onChangeText={setPassword}
        value={password}
        leftElement={
          <Ionicons
            name="lock-closed-outline"
            size={19}
            color={publicTheme.secondaryText}
          />
        }
        rightElement={
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            style={styles.eyeButton}
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? "Hide password" : "Show password"
            }
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={19}
              color={publicTheme.secondaryText}
            />
          </TouchableOpacity>
        }
      />

      {/* Forgot Password Link */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push("/(auth)/forgot-password-patient")}
        style={[
          styles.forgotWrap,
          { alignSelf: isRTL ? "flex-start" : "flex-end" },
        ]}
      >
        <Text
          style={[styles.forgotText, { color: publicTheme.primaryText }]}
        >
          {t("auth.patientSignIn.forgotPassword", {
            defaultValue: isArabic ? "نسيت كلمة المرور؟" : "Forgot password?",
          })}
        </Text>
      </TouchableOpacity>

      {/* Error Banner */}
      {errorText ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text style={styles.errorText} color="#DC2626">
            {errorText}
          </Text>
        </View>
      ) : null}

      {/* Submit Button */}
      <Button
        title={
          isSubmitting
            ? t("auth.common.pleaseWait", {
                defaultValue: isArabic
                  ? "جارٍ تسجيل الدخول..."
                  : "Please wait...",
              })
            : t("auth.patientSignIn.submit", {
                defaultValue: isArabic ? "تسجيل الدخول كمريض" : "Sign In",
              })
        }
        onPress={() => void handleSubmit()}
        disabled={isSubmitting || !email || !password || Boolean(emailError)}
        style={[
          styles.primaryButton,
          { backgroundColor: publicTheme.primaryText },
        ]}
      />

      {/* Alternative Sign-In Divider */}
      <View style={styles.altSignInHeader}>
        <View
          style={[
            styles.divider,
            { backgroundColor: publicTheme.subtleBorder },
          ]}
        />
        <Text
          variant="caption"
          color={publicTheme.secondaryText}
          style={styles.altSignInText}
        >
          {t("auth.entry.eyebrow", {
            defaultValue: isArabic ? "أو الدخول عبر" : "OR CONTINUE WITH",
          })}
        </Text>
        <View
          style={[
            styles.divider,
            { backgroundColor: publicTheme.subtleBorder },
          ]}
        />
      </View>

      {/* Google Sign-In */}
      <PatientGoogleSignInButton
        title={t("auth.patientSignIn.googleButton", {
          defaultValue: isArabic
            ? "المتابعة باستخدام حساب Google"
            : "Continue with Google",
        })}
        unavailableText={t("auth.patientSignIn.googleUnavailable", {
          defaultValue: isArabic
            ? "خدمة Google غير متوفرة حالياً"
            : "Google Sign-In unavailable",
        })}
        onTokenReceived={signInPatientWithGoogle}
      />

      {/* Sign-Up Footer Row */}
      <View style={styles.footerRow}>
        <Text color={publicTheme.secondaryText} style={styles.footerLabel}>
          {t("auth.patientSignIn.noAccount", {
            defaultValue: isArabic
              ? "ليس لديك حساب مريض؟"
              : "Don't have an account?",
          })}
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/signup/patient")}
        >
          <Text style={[styles.signupLink, { color: publicTheme.primaryText }]}>
            {t("auth.patientSignIn.createAccount", {
              defaultValue: isArabic
                ? "أنشئ حساباً جديداً مجاناً"
                : "Create free account",
            })}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dev Test Accounts Section */}
      {__DEV__ && DEV_ACCOUNTS.length > 0 && (
        <View
          style={[
            styles.devBox,
            {
              backgroundColor: publicTheme.accentMint,
              borderColor: publicTheme.subtleBorder,
            },
          ]}
        >
          <View style={styles.devHeader}>
            <Ionicons
              name="flash-outline"
              size={14}
              color={publicTheme.primaryText}
            />
            <Text
              variant="caption"
              weight="700"
              color={publicTheme.primaryText}
              style={styles.devTitle}
            >
              حسابات التجربة والاختبار
            </Text>
          </View>
          <View style={styles.devRow}>
            {DEV_ACCOUNTS.map((account) => (
              <TouchableOpacity
                key={account.email}
                style={[
                  styles.devChip,
                  {
                    backgroundColor: publicTheme.raisedSurface,
                    borderColor: publicTheme.subtleBorder,
                  },
                ]}
                onPress={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                  setErrorText(null);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.devChipTitle,
                    { color: publicTheme.primaryText },
                  ]}
                  weight="700"
                >
                  {account.label}
                </Text>
                <Text
                  variant="caption"
                  color={publicTheme.secondaryText}
                  style={styles.devChipText}
                >
                  {account.email}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {isSubmitting ? (
        <ActivityIndicator
          style={styles.loader}
          color={publicTheme.primaryText}
        />
      ) : null}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  forgotWrap: {
    marginTop: -4,
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  eyeButton: {
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  primaryButton: {
    borderRadius: 16,
    minHeight: 52,
    justifyContent: "center",
    marginBottom: 14,
  },
  altSignInHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 12,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  altSignInText: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 11,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    flexWrap: "wrap",
  },
  footerLabel: {
    fontSize: 13.5,
  },
  signupLink: {
    fontWeight: "800",
    textDecorationLine: "underline",
    fontSize: 13.5,
  },
  devBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginTop: 18,
    gap: 8,
  },
  devHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  devTitle: {
    fontSize: 12,
  },
  devRow: {
    gap: 6,
  },
  devChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  devChipTitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  devChipText: {
    fontSize: 11.5,
  },
  backText: {
    fontSize: 13,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  loader: {
    marginTop: 8,
  },
});
