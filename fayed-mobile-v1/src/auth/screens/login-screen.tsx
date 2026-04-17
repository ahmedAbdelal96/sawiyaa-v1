import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { z } from "zod";

import { AuthShell } from "@/auth/components/auth-shell";
import { useLogin } from "@/auth/hooks/use-auth-actions";
import { routes } from "@/core/constants/routes";
import { AppError } from "@/core/errors/app-error";
import { useAppTheme } from "@/core/theme/theme-provider";
import { AppButton, AppChip, AppInput, AppScreen, AppText } from "@/shared/ui";

const QUICK_LOGIN_ACCOUNTS = [
  { email: "patient.one@fayed.local", password: "Patient@12345" },
  { email: "patient.two@fayed.local", password: "Patient2@12345" },
] as const;

export function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const loginMutation = useLogin();

  const schema = z.object({
    email: z.email(t("validationEmail")),
    password: z.string().min(6, t("validationPassword")),
  });

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await loginMutation.mutateAsync(values);
    router.replace(routes.app.home);
  });

  const errorMessage =
    loginMutation.error instanceof AppError ? loginMutation.error.message : undefined;

  const applyQuickLogin = (account: (typeof QUICK_LOGIN_ACCOUNTS)[number]) => {
    form.setValue("email", account.email, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.setValue("password", account.password, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.clearErrors();
    loginMutation.reset();
  };

  return (
    <AppScreen scroll contentStyle={{ justifyContent: "center", gap: spacing.lg, paddingBottom: spacing.xxxl }}>
      <AuthShell title={t("loginTitle")} subtitle={t("loginSubtitle")}>
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <AppText variant="bodySmall" color={colors.textSecondary}>
              حسابات تجريبية سريعة
            </AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {QUICK_LOGIN_ACCOUNTS.map((account) => (
                <AppChip
                  key={account.email}
                  label={account.email}
                  onPress={() => applyQuickLogin(account)}
                />
              ))}
            </View>
          </View>

          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <AppInput
                autoCapitalize="none"
                keyboardType="email-address"
                label={t("emailLabel")}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                value={field.value}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <AppInput
                autoCapitalize="none"
                label={t("passwordLabel")}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                secureTextEntry
                value={field.value}
                error={fieldState.error?.message}
              />
            )}
          />

          {errorMessage ? <AppText color={colors.danger}>{errorMessage}</AppText> : null}

          <AppButton
            label={t("submitLogin")}
            loading={loginMutation.isPending}
            onPress={onSubmit}
          />
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
            <View style={{ backgroundColor: "rgba(194,198,211,0.5)", flex: 1, height: 1 }} />
            <AppText color={colors.textMuted} variant="caption">
              أو
            </AppText>
            <View style={{ backgroundColor: "rgba(194,198,211,0.5)", flex: 1, height: 1 }} />
          </View>

          <Pressable onPress={() => router.push(routes.public.register)}>
            <AppText color={colors.textSecondary} align="center">
              {t("linkNoAccount")} {t("goToRegister")}
            </AppText>
          </Pressable>
        </View>
      </AuthShell>
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "center" }}>
        <AppText color={colors.primary} variant="caption">
          100% Secure
        </AppText>
        <AppText color={colors.secondary} variant="caption">
          Private
        </AppText>
        <AppText color={colors.textSecondary} variant="caption">
          Trusted Specialists
        </AppText>
      </View>
    </AppScreen>
  );
}
