import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Card, ErrorState, Header, Input, LoadingState, Screen, Text } from "../../../../components/ui";
import { extractApiErrorCode } from "../../../../lib/api";
import { useTheme } from "../../../../providers/ThemeProvider";
import { usePractitionerProfile, useUpdatePractitionerProfile } from "../hooks";
import { missingNormalPriceFields, normalPricingToForm, normalPricingToPayload, type NormalPriceForm } from "../normal-pricing";

const emptyForm = (): NormalPriceForm => ({
  sessionPrice30Egp: "",
  sessionPrice30Usd: "",
  sessionPrice60Egp: "",
  sessionPrice60Usd: "",
});

export default function NormalPricingScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const profileQuery = usePractitionerProfile();
  const update = useUpdatePractitionerProfile();
  const [form, setForm] = useState<NormalPriceForm>(emptyForm);
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const profile = profileQuery.data?.profile;

  useEffect(() => {
    if (profile && initializedFor !== profile.practitionerProfileId) {
      setForm(normalPricingToForm(profile));
      setInitializedFor(profile.practitionerProfileId);
    }
  }, [initializedFor, profile]);

  const missingFields = useMemo(() => missingNormalPriceFields(form), [form]);

  const save = async () => {
    if (update.isPending || missingFields.length > 0) return;
    try {
      await update.mutateAsync(normalPricingToPayload(form));
      await profileQuery.refetch();
      Alert.alert(t("practitioner.normalPricing.savedTitle"), t("practitioner.normalPricing.savedBody"));
    } catch (error) {
      const code = extractApiErrorCode(error);
      Alert.alert(
        t("common.error"),
        code === "VALIDATION_FAILED"
          ? t("practitioner.normalPricing.validationError")
          : t("practitioner.normalPricing.saveError"),
      );
    }
  };

  if (profileQuery.isLoading) {
    return <Screen><Header showBack title={t("practitioner.normalPricing.title")} /><LoadingState message={t("practitioner.normalPricing.loading")} /></Screen>;
  }
  if (profileQuery.isError || !profile) {
    return <Screen><Header showBack title={t("practitioner.normalPricing.title")} /><ErrorState title={t("practitioner.normalPricing.errorTitle")} message={t("practitioner.normalPricing.errorBody")} onRetry={profileQuery.refetch} /></Screen>;
  }

  return (
    <Screen>
      <Header showBack title={t("practitioner.normalPricing.title")} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="outlined" padding="md">
          <Text weight="700" color={theme.colors.textPrimary}>{t("practitioner.normalPricing.heading")}</Text>
          <Text color={theme.colors.textSecondary} style={styles.body}>{t("practitioner.normalPricing.body")}</Text>
          <Text weight="700" color={theme.colors.textPrimary} style={styles.group}>{t("practitioner.normalPricing.duration30")}</Text>
          <Input label={t("practitioner.normalPricing.fields.egp30")} value={form.sessionPrice30Egp} onChangeText={(value) => setForm((current) => ({ ...current, sessionPrice30Egp: value }))} keyboardType="decimal-pad" placeholder="0" />
          <Input label={t("practitioner.normalPricing.fields.usd30")} value={form.sessionPrice30Usd} onChangeText={(value) => setForm((current) => ({ ...current, sessionPrice30Usd: value }))} keyboardType="decimal-pad" placeholder="0" />
          <Text weight="700" color={theme.colors.textPrimary} style={styles.group}>{t("practitioner.normalPricing.duration60")}</Text>
          <Input label={t("practitioner.normalPricing.fields.egp60")} value={form.sessionPrice60Egp} onChangeText={(value) => setForm((current) => ({ ...current, sessionPrice60Egp: value }))} keyboardType="decimal-pad" placeholder="0" />
          <Input label={t("practitioner.normalPricing.fields.usd60")} value={form.sessionPrice60Usd} onChangeText={(value) => setForm((current) => ({ ...current, sessionPrice60Usd: value }))} keyboardType="decimal-pad" placeholder="0" />
          {missingFields.length > 0 ? <Text variant="caption" color={theme.colors.warning} style={styles.note}>{t("practitioner.normalPricing.required")}</Text> : null}
          <Button title={t("practitioner.normalPricing.save")} onPress={() => void save()} loading={update.isPending} disabled={missingFields.length > 0} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  body: { marginTop: 8, lineHeight: 21 },
  group: { marginTop: 20, marginBottom: 12 },
  note: { marginBottom: 12, textAlign: "center" },
});
