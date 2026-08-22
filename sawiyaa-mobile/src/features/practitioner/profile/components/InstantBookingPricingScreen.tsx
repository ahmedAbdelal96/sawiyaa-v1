import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Card, ErrorState, Header, Input, LoadingState, Screen, Text } from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { extractApiErrorCode } from "../../../../lib/api";
import { usePractitionerProfile, useUpdatePractitionerProfile } from "../hooks";
import { useMyPresence, useSetInstantBooking } from "../../presence/hooks";
import { instantBookingPricingToForm, instantBookingPricingToPayload, missingInstantBookingPriceFields, type InstantBookingPriceForm } from "../instant-booking-pricing";

const emptyForm = (): InstantBookingPriceForm => ({ instantBookingPrice30Egp: "", instantBookingPrice30Usd: "", instantBookingPrice60Egp: "", instantBookingPrice60Usd: "" });

export default function InstantBookingPricingScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const profileQuery = usePractitionerProfile();
  const presenceQuery = useMyPresence();
  const update = useUpdatePractitionerProfile();
  const instantBookingToggle = useSetInstantBooking();
  const [form, setForm] = useState<InstantBookingPriceForm>(emptyForm);
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const isArabic = i18n.language?.startsWith("ar") ?? false;

  const profile = profileQuery.data?.profile;
  useEffect(() => {
    if (profile && initializedFor !== profile.practitionerProfileId) {
      setForm(instantBookingPricingToForm(profile));
      setInitializedFor(profile.practitionerProfileId);
    }
  }, [initializedFor, profile]);

  const missingFields = useMemo(() => missingInstantBookingPriceFields(form), [form]);

  const toggleInstantBooking = async (isInstantBookingEnabled: boolean) => {
    if (instantBookingToggle.isPending || missingFields.length > 0) return;
    try {
      await instantBookingToggle.mutateAsync({ isInstantBookingEnabled });
      await presenceQuery.refetch();
    } catch (error) {
      const code = extractApiErrorCode(error);
      Alert.alert(
        t("common.error"),
        code === "PRESENCE_INSTANT_BOOKING_PRICING_REQUIRED"
          ? t("practitioner.instantBookingPricing.enablePricingRequired")
          : t("practitioner.instantBookingPricing.enableError"),
      );
    }
  };

  const save = async () => {
    if (update.isPending || missingFields.length > 0) return;
    try {
      await update.mutateAsync(instantBookingPricingToPayload(form));
      await profileQuery.refetch();
      Alert.alert(t("practitioner.instantBookingPricing.savedTitle"), t("practitioner.instantBookingPricing.savedBody"));
    } catch (error) {
      const code = extractApiErrorCode(error);
      Alert.alert(t("common.error"), code === "VALIDATION_FAILED" ? t("practitioner.instantBookingPricing.validationError") : t("practitioner.instantBookingPricing.saveError"));
    }
  };

  if (profileQuery.isLoading) {
    return <Screen><Header showBack title={t("practitioner.instantBookingPricing.title")} /><LoadingState message={t("practitioner.instantBookingPricing.loading")} /></Screen>;
  }
  if (profileQuery.isError || !profile) {
    return <Screen><Header showBack title={t("practitioner.instantBookingPricing.title")} /><ErrorState title={t("practitioner.instantBookingPricing.errorTitle")} message={t("practitioner.instantBookingPricing.errorBody")} onRetry={profileQuery.refetch} /></Screen>;
  }

  return <Screen><Header showBack title={t("practitioner.instantBookingPricing.title")} /><ScrollView contentContainerStyle={styles.content}>
    <Card variant="outlined" padding="md"><Text weight="700" color={theme.colors.textPrimary}>{t("practitioner.instantBookingPricing.heading")}</Text><Text color={theme.colors.textSecondary} style={styles.body}>{t("practitioner.instantBookingPricing.body")}</Text>
      <Text weight="700" color={theme.colors.textPrimary} style={styles.group}>{t("practitioner.instantBookingPricing.duration30")}</Text>
      <Input label={t("practitioner.instantBookingPricing.fields.egp30")} value={form.instantBookingPrice30Egp} onChangeText={(value) => setForm((current) => ({ ...current, instantBookingPrice30Egp: value }))} keyboardType="decimal-pad" placeholder="0" />
      <Input label={t("practitioner.instantBookingPricing.fields.usd30")} value={form.instantBookingPrice30Usd} onChangeText={(value) => setForm((current) => ({ ...current, instantBookingPrice30Usd: value }))} keyboardType="decimal-pad" placeholder="0" />
      <Text weight="700" color={theme.colors.textPrimary} style={styles.group}>{t("practitioner.instantBookingPricing.duration60")}</Text>
      <Input label={t("practitioner.instantBookingPricing.fields.egp60")} value={form.instantBookingPrice60Egp} onChangeText={(value) => setForm((current) => ({ ...current, instantBookingPrice60Egp: value }))} keyboardType="decimal-pad" placeholder="0" />
      <Input label={t("practitioner.instantBookingPricing.fields.usd60")} value={form.instantBookingPrice60Usd} onChangeText={(value) => setForm((current) => ({ ...current, instantBookingPrice60Usd: value }))} keyboardType="decimal-pad" placeholder="0" />
      {missingFields.length > 0 ? <Text variant="caption" color={theme.colors.warning} style={styles.note}>{t("practitioner.instantBookingPricing.required")}</Text> : null}
      <Button title={t("practitioner.instantBookingPricing.save")} onPress={() => void save()} loading={update.isPending} disabled={missingFields.length > 0} />
      <View style={[styles.toggleRow, { borderColor: theme.colors.divider }]}>
        <View style={styles.toggleCopy}>
          <Text weight="700" color={theme.colors.textPrimary}>{t("practitioner.instantBookingPricing.enableLabel")}</Text>
          <Text variant="caption" color={theme.colors.textSecondary}>
            {presenceQuery.data?.presence?.isInstantBookingEnabled
              ? t("practitioner.instantBookingPricing.enabledLabel")
              : t("practitioner.instantBookingPricing.disabledLabel")}
          </Text>
        </View>
        <Switch
          value={Boolean(presenceQuery.data?.presence?.isInstantBookingEnabled)}
          onValueChange={(value) => void toggleInstantBooking(value)}
          disabled={presenceQuery.isLoading || instantBookingToggle.isPending || missingFields.length > 0}
        />
      </View>
    </Card>
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  body: { marginTop: 8, lineHeight: 21 },
  group: { marginTop: 20, marginBottom: 12 },
  note: { marginBottom: 12, textAlign: "center" },
  toggleRow: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  toggleCopy: { flex: 1, gap: 3 },
});
