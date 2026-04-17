import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { z } from "zod";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import { useCreateCareChatRequest } from "@/modules/care-chat/hooks/use-care-chat";
import { AppButton, AppCard, AppErrorState, AppHeader, AppInput, AppScreen, AppText } from "@/shared/ui";

const createRequestSchema = z.object({
  practitionerSlug: z.string().min(2).max(191),
  reason: z.string().max(1000).optional(),
  relatedSessionId: z.string().uuid().optional().or(z.literal("")),
});

type CreateRequestFormValues = z.infer<typeof createRequestSchema>;

export function CareChatCreateRequestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    slug?: string;
    relatedSessionId?: string;
    reason?: string;
  }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug || "";
  const relatedSessionIdParam = Array.isArray(params.relatedSessionId)
    ? params.relatedSessionId[0]
    : params.relatedSessionId || "";
  const reasonParam = Array.isArray(params.reason) ? params.reason[0] : params.reason || "";
  const hasPrefill = Boolean(slug || relatedSessionIdParam || reasonParam);
  const { spacing } = useAppTheme();
  const createRequestMutation = useCreateCareChatRequest();
  const { control, handleSubmit } = useForm<CreateRequestFormValues>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      practitionerSlug: slug,
      reason: reasonParam,
      relatedSessionId: relatedSessionIdParam,
    },
  });

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader
          title={t("careChatCreateTitle")}
          subtitle={t("careChatCreateSubtitle")}
        />

        <AppCard>
          <View style={{ gap: spacing.md }}>
            {hasPrefill ? (
              <AppText>{t("prefillHintCareChatContext")}</AppText>
            ) : null}
            <Controller
              control={control}
              name="practitionerSlug"
              render={({ field, fieldState }) => (
                <AppInput
                  label={t("careChatFieldPractitionerSlug")}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="relatedSessionId"
              render={({ field, fieldState }) => (
                <AppInput
                  label={t("careChatFieldSessionId")}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="reason"
              render={({ field, fieldState }) => (
                <AppInput
                  label={t("careChatFieldReason")}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  multiline
                  numberOfLines={5}
                />
              )}
            />

            <AppButton
              label={t("careChatSubmitRequest")}
              loading={createRequestMutation.isPending}
              onPress={handleSubmit((values) =>
                createRequestMutation.mutate(
                  {
                    practitionerSlug: values.practitionerSlug.trim(),
                    reason: values.reason?.trim() || undefined,
                    relatedSessionId: values.relatedSessionId?.trim() || undefined,
                  },
                  {
                    onSuccess: (request) => {
                      router.replace(routes.app.careChatRequestDetails(request.id));
                    },
                  },
                ),
              )}
            />
            {createRequestMutation.isError ? <AppErrorState /> : null}
          </View>
        </AppCard>
      </View>
    </AppScreen>
  );
}
