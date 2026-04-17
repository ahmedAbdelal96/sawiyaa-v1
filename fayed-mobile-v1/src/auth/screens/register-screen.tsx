import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { z } from "zod";

import { AuthShell } from "@/auth/components/auth-shell";
import { useRegister } from "@/auth/hooks/use-auth-actions";
import { routes } from "@/core/constants/routes";
import { AppError } from "@/core/errors/app-error";
import { useAppTheme } from "@/core/theme/theme-provider";
import { AppButton, AppInput, AppScreen, AppText } from "@/shared/ui";

export function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const registerMutation = useRegister();

  const schema = z.object({
    displayName: z.string().min(2, t("validationDisplayName")),
    email: z.email(t("validationEmail")),
    password: z.string().min(6, t("validationPassword")),
  });

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await registerMutation.mutateAsync(values);
    router.replace(routes.app.home);
  });

  const errorMessage =
    registerMutation.error instanceof AppError ? registerMutation.error.message : undefined;

  return (
    <AppScreen scroll contentStyle={{ justifyContent: "center", gap: spacing.lg }}>
      <AuthShell title={t("registerTitle")} subtitle={t("registerSubtitle")}>
        <View style={{ gap: spacing.lg }}>
          <Controller
            control={form.control}
            name="displayName"
            render={({ field, fieldState }) => (
              <AppInput
                label={t("displayNameLabel")}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                value={field.value}
                error={fieldState.error?.message}
              />
            )}
          />

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
            label={t("submitRegister")}
            loading={registerMutation.isPending}
            onPress={onSubmit}
          />
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
            <View style={{ backgroundColor: "rgba(194,198,211,0.5)", flex: 1, height: 1 }} />
            <AppText color={colors.textMuted} variant="caption">
              أو
            </AppText>
            <View style={{ backgroundColor: "rgba(194,198,211,0.5)", flex: 1, height: 1 }} />
          </View>

          <Pressable onPress={() => router.push(routes.public.login)}>
            <AppText color={colors.textSecondary} align="center">
              {t("linkHaveAccount")} {t("goToLogin")}
            </AppText>
          </Pressable>
        </View>
      </AuthShell>
    </AppScreen>
  );
}
