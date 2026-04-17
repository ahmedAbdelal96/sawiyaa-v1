import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { z } from "zod";

import { routes } from "@/core/constants/routes";
import { useAppTheme } from "@/core/theme/theme-provider";
import type { CreateSupportTicketInput, SupportTicketType } from "@/modules/support/domain/support.types";
import { useCreateSupportTicket } from "@/modules/support/hooks/use-support";
import { AppButton, AppCard, AppChip, AppErrorState, AppHeader, AppInput, AppScreen, AppText } from "@/shared/ui";

const createTicketSchema = z.object({
  category: z.enum([
    "BOOKING",
    "PAYMENT",
    "SESSION",
    "TECHNICAL",
    "ACCOUNT",
    "MATCHING",
    "GENERAL",
    "CONTENT",
    "CHAT",
    "OTHER",
  ]),
  subject: z.string().min(3).max(191),
  description: z.string().min(3).max(2000),
  relatedSessionId: z.string().uuid().optional().or(z.literal("")),
  relatedPaymentId: z.string().uuid().optional().or(z.literal("")),
});

type CreateTicketFormValues = z.infer<typeof createTicketSchema>;

const CATEGORY_OPTIONS: SupportTicketType[] = [
  "GENERAL",
  "BOOKING",
  "PAYMENT",
  "SESSION",
  "TECHNICAL",
  "ACCOUNT",
  "MATCHING",
  "CONTENT",
  "CHAT",
  "OTHER",
];

function toCategory(value: string | undefined): SupportTicketType {
  if (!value) return "GENERAL";
  const match = CATEGORY_OPTIONS.find((item) => item === value);
  return match || "GENERAL";
}

export function SupportCreateTicketScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: string;
    relatedSessionId?: string;
    relatedPaymentId?: string;
    subject?: string;
    description?: string;
  }>();
  const { spacing, colors } = useAppTheme();
  const createTicketMutation = useCreateSupportTicket();

  const rawCategory = Array.isArray(params.category) ? params.category[0] : params.category;
  const rawRelatedSessionId = Array.isArray(params.relatedSessionId)
    ? params.relatedSessionId[0]
    : params.relatedSessionId;
  const rawRelatedPaymentId = Array.isArray(params.relatedPaymentId)
    ? params.relatedPaymentId[0]
    : params.relatedPaymentId;
  const rawSubject = Array.isArray(params.subject) ? params.subject[0] : params.subject;
  const rawDescription = Array.isArray(params.description)
    ? params.description[0]
    : params.description;

  const hasPrefill = Boolean(
    rawCategory || rawRelatedSessionId || rawRelatedPaymentId || rawSubject || rawDescription,
  );

  const { control, handleSubmit, watch, setValue } = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      category: toCategory(rawCategory),
      subject: rawSubject || "",
      description: rawDescription || "",
      relatedSessionId: rawRelatedSessionId || "",
      relatedPaymentId: rawRelatedPaymentId || "",
    },
  });

  const selectedCategory = watch("category");

  return (
    <AppScreen scroll>
      <View style={{ gap: spacing.lg }}>
        <AppHeader
          title={t("supportCreateTicketTitle")}
          subtitle={t("supportCreateTicketSubtitle")}
        />
        {hasPrefill ? (
          <AppCard>
            <AppText color={colors.textSecondary}>{t("prefillHintSupportContext")}</AppText>
          </AppCard>
        ) : null}
        <AppCard>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {CATEGORY_OPTIONS.map((category) => (
                <AppChip
                  key={category}
                  label={t(`supportCategory_${category}`)}
                  selected={selectedCategory === category}
                  onPress={() => setValue("category", category)}
                />
              ))}
            </View>

            <Controller
              control={control}
              name="subject"
              render={({ field, fieldState }) => (
                <AppInput
                  label={t("supportFieldSubject")}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="description"
              render={({ field, fieldState }) => (
                <AppInput
                  label={t("supportFieldDescription")}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  multiline
                  numberOfLines={6}
                />
              )}
            />

            <Controller
              control={control}
              name="relatedSessionId"
              render={({ field, fieldState }) => (
                <AppInput
                  label={t("supportFieldRelatedSession")}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="relatedPaymentId"
              render={({ field, fieldState }) => (
                <AppInput
                  label={t("supportFieldRelatedPayment")}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            <AppButton
              label={t("supportSubmitTicket")}
              loading={createTicketMutation.isPending}
              onPress={handleSubmit((values) => {
                const payload: CreateSupportTicketInput = {
                  category: values.category,
                  subject: values.subject.trim(),
                  description: values.description.trim(),
                  relatedSessionId: values.relatedSessionId?.trim() || undefined,
                  relatedPaymentId: values.relatedPaymentId?.trim() || undefined,
                };
                createTicketMutation.mutate(payload, {
                  onSuccess: (ticket) => {
                    router.replace(routes.app.supportTicketDetails(ticket.id));
                  },
                });
              })}
            />
            {createTicketMutation.isError ? <AppErrorState /> : null}
          </View>
        </AppCard>
      </View>
    </AppScreen>
  );
}
