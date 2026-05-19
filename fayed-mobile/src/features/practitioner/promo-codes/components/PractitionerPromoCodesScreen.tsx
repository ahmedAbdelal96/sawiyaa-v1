import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  Input,
  LoadingState,
  Screen,
  StatusChip,
  Text,
  formatDateTime,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { extractApiErrorMessage } from "../../../../lib/api";
import {
  buildCreatePractitionerCouponRequest,
  buildUpdatePractitionerCouponRequest,
  classifyPractitionerPromoCodeError,
  normalizePercentageInput,
  sanitizePractitionerPromoCodeInput,
  validatePractitionerPromoCodeForm,
  type PractitionerPromoCodeFormValues,
} from "../coupon-utils";
import {
  useCreatePractitionerCoupon,
  useDisablePractitionerCoupon,
  usePractitionerCoupon,
  usePractitionerCouponRedemptions,
  usePractitionerCoupons,
  useUpdatePractitionerCoupon,
} from "../hooks";
import type {
  PractitionerCouponItem,
  PractitionerCouponRedemptionItem,
  PractitionerCouponStatus,
} from "../types";

type PanelMode = "none" | "create" | "edit" | "details";

type ScreenFeedback =
  | {
      tone: "success";
      title: string;
      body: string;
    }
  | {
      tone: "warning";
      title: string;
      body: string;
    }
  | null;

const DEFAULT_LIST_LIMIT = 50;
const DEFAULT_REDEMPTION_LIMIT = 20;

export default function PractitionerPromoCodesScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const [panelMode, setPanelMode] = useState<PanelMode>("none");
  const [activeCouponId, setActiveCouponId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ScreenFeedback>(null);

  const listQuery = usePractitionerCoupons({ page: 1, limit: DEFAULT_LIST_LIMIT });
  const detailQuery = usePractitionerCoupon(
    panelMode === "edit" || panelMode === "details" ? activeCouponId : null,
  );
  const redemptionsQuery = usePractitionerCouponRedemptions(
    panelMode === "details" ? activeCouponId : null,
    panelMode === "details"
      ? { page: 1, limit: DEFAULT_REDEMPTION_LIMIT }
      : undefined,
  );

  const createMutation = useCreatePractitionerCoupon();
  const updateMutation = useUpdatePractitionerCoupon();
  const disableMutation = useDisablePractitionerCoupon();

  const listItems = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);
  const selectedCoupon = useMemo(() => {
    if (!activeCouponId) {
      return null;
    }

    return (
      detailQuery.data?.item ??
      listItems.find((item) => item.id === activeCouponId) ??
      null
    );
  }, [activeCouponId, detailQuery.data?.item, listItems]);

  const isInitialLoading = listQuery.isLoading && listItems.length === 0;
  const listError = listQuery.isError && listItems.length === 0;

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const openCreate = () => {
    setActiveCouponId(null);
    setPanelMode("create");
  };

  const openEdit = (couponId: string) => {
    setActiveCouponId(couponId);
    setPanelMode("edit");
  };

  const openDetails = (couponId: string) => {
    setActiveCouponId(couponId);
    setPanelMode("details");
  };

  const closePanel = () => {
    setPanelMode("none");
    setActiveCouponId(null);
  };

  const handleCreate = async (values: PractitionerPromoCodeFormValues) => {
    const payload = buildCreatePractitionerCouponRequest(values);
    try {
      const result = await createMutation.mutateAsync(payload);
      setFeedback({
        tone: "success",
        title: t("practitioner.promoCodes.notifications.createdTitle"),
        body: t("practitioner.promoCodes.notifications.createdBody", {
          code: result.item.code,
        }),
      });
      closePanel();
    } catch (error) {
      throw mapCouponError(error, t);
    }
  };

  const handleUpdate = async (
    coupon: PractitionerCouponItem,
    values: PractitionerPromoCodeFormValues,
  ) => {
    const payload = buildUpdatePractitionerCouponRequest(values, {
      skipDiscountValue: Boolean(coupon.currentUsageCount),
    });
    try {
      const result = await updateMutation.mutateAsync({
        couponId: coupon.id,
        payload,
      });
      setFeedback({
        tone: "success",
        title: t("practitioner.promoCodes.notifications.updatedTitle"),
        body: t("practitioner.promoCodes.notifications.updatedBody", {
          code: result.item.code,
        }),
      });
      closePanel();
    } catch (error) {
      throw mapCouponError(error, t);
    }
  };

  const handleDisable = (coupon: PractitionerCouponItem) => {
    Alert.alert(
      t("practitioner.promoCodes.disable.title"),
      t("practitioner.promoCodes.disable.body"),
      [
        { text: t("practitioner.common.cancel"), style: "cancel" },
        {
          text: t("practitioner.promoCodes.disable.confirm"),
          style: "destructive",
          onPress: async () => {
            try {
              await disableMutation.mutateAsync(coupon.id);
              setFeedback({
                tone: "warning",
                title: t("practitioner.promoCodes.notifications.disabledTitle"),
                body: t("practitioner.promoCodes.notifications.disabledBody", {
                  code: coupon.code,
                }),
              });
            } catch (error) {
              Alert.alert(
                t("practitioner.promoCodes.errors.genericTitle"),
                mapCouponError(error, t).message,
              );
            }
          },
        },
      ],
    );
  };

  if (isInitialLoading) {
    return (
      <Screen bg="background">
        <Header
          title={t("practitioner.promoCodes.title")}
          showBack
          rightElement={
            <TouchableOpacity onPress={() => listQuery.refetch()} style={styles.headerAction}>
              <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          }
        />
        <LoadingState
          fullScreen
          message={t("practitioner.promoCodes.loading")}
        />
      </Screen>
    );
  }

  if (listError) {
    return (
      <Screen bg="background">
        <Header
          title={t("practitioner.promoCodes.title")}
          showBack
          rightElement={
            <TouchableOpacity onPress={() => listQuery.refetch()} style={styles.headerAction}>
              <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          }
        />
        <ErrorState
          fullScreen
          title={t("practitioner.promoCodes.errorTitle")}
          message={t("practitioner.promoCodes.errorBody")}
          onRetry={() => listQuery.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header
        title={t("practitioner.promoCodes.title")}
        showBack
        rightElement={
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => listQuery.refetch()} style={styles.headerAction}>
              <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={openCreate} style={styles.headerAction}>
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={listQuery.isRefetching}
            onRefresh={() => listQuery.refetch()}
            tintColor={theme.colors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card variant="elevated" padding="lg" style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <Text weight="bold" style={styles.heroTitle}>
                {t("practitioner.promoCodes.title")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.heroSubtitle}>
                {t("practitioner.promoCodes.subtitle")}
              </Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="pricetag-outline" size={24} color={theme.colors.primary} />
            </View>
          </View>

          <Text color={theme.colors.textSecondary} style={styles.heroNote}>
            {t("practitioner.promoCodes.financialNote")}
          </Text>

          <Button
            title={t("practitioner.promoCodes.createCta")}
            onPress={openCreate}
          />
        </Card>

        {feedback ? (
          <Card
            variant="flat"
            padding="md"
            style={[
              styles.feedbackCard,
              {
                backgroundColor:
                  feedback.tone === "success"
                    ? `${theme.colors.success}15`
                    : `${theme.colors.warning}15`,
              },
            ]}
          >
            <View style={styles.feedbackRow}>
              <StatusChip
                label={feedback.tone === "success"
                  ? t("practitioner.promoCodes.notifications.success")
                  : t("practitioner.promoCodes.notifications.notice")}
                tone={feedback.tone === "success" ? "success" : "warning"}
                showDot={false}
              />
            </View>
            <Text weight="600" style={styles.feedbackTitle}>
              {feedback.title}
            </Text>
            <Text color={theme.colors.textSecondary} style={styles.feedbackBody}>
              {feedback.body}
            </Text>
          </Card>
        ) : null}

        {listItems.length ? (
          <View style={styles.list}>
            {listItems.map((coupon) => (
              <CouponCard
                key={coupon.id}
                coupon={coupon}
                locale={locale}
                theme={theme}
                t={t}
                onEdit={() => openEdit(coupon.id)}
                onDisable={() => handleDisable(coupon)}
                onDetails={() => openDetails(coupon.id)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title={t("practitioner.promoCodes.empty.title")}
            description={t("practitioner.promoCodes.empty.body")}
            actionLabel={t("practitioner.promoCodes.empty.action")}
            onAction={openCreate}
            icon={
              <Ionicons
                name="pricetag-outline"
                size={48}
                color={theme.colors.textMuted}
              />
            }
          />
        )}
      </ScrollView>

      <PromoCodeFormModal
        visible={panelMode === "create" || panelMode === "edit"}
        mode={panelMode === "edit" ? "edit" : "create"}
        coupon={selectedCoupon}
        theme={theme}
        t={t}
        loading={createMutation.isPending || updateMutation.isPending}
        onClose={closePanel}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <PromoCodeDetailModal
        visible={panelMode === "details"}
        coupon={selectedCoupon}
        locale={locale}
        theme={theme}
        t={t}
        loading={detailQuery.isLoading || redemptionsQuery.isLoading}
        error={detailQuery.isError || redemptionsQuery.isError}
        onClose={closePanel}
        onRetry={() => {
          detailQuery.refetch();
          redemptionsQuery.refetch();
        }}
        redemptions={redemptionsQuery.data?.items ?? []}
      />
    </Screen>
  );
}

function CouponCard({
  coupon,
  locale,
  theme,
  t,
  onEdit,
  onDisable,
  onDetails,
}: {
  coupon: PractitionerCouponItem;
  locale: string;
  theme: ReturnType<typeof useTheme>["theme"];
  t: ReturnType<typeof useTranslation>["t"];
  onEdit: () => void;
  onDisable: () => void;
  onDetails: () => void;
}) {
  const statusTone = resolveCouponStatusTone(coupon.status);

  return (
    <Card variant="outlined" padding="lg" style={styles.couponCard}>
      <View style={styles.couponTopRow}>
        <View style={styles.couponTextWrap}>
          <Text weight="bold" style={styles.couponCode}>
            {coupon.code}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.couponSubtitle}>
            {t("practitioner.promoCodes.list.discount", {
              value: formatPercentLabel(coupon.discountValue),
            })}
          </Text>
        </View>
        <StatusChip
          label={t(`practitioner.promoCodes.status.${coupon.status}`, coupon.status)}
          tone={statusTone}
          showDot={false}
        />
      </View>

      <View style={styles.couponMetaGrid}>
        <MetaPill
          label={t("practitioner.promoCodes.list.usage")}
          value={coupon.usageLimitTotal ? `${coupon.currentUsageCount} / ${coupon.usageLimitTotal}` : `${coupon.currentUsageCount}`}
          theme={theme}
        />
        <MetaPill
          label={t("practitioner.promoCodes.list.perPatient")}
          value={coupon.usageLimitPerPatient ? String(coupon.usageLimitPerPatient) : t("common.notSet", "Not set")}
          theme={theme}
        />
      </View>

      <Text color={theme.colors.textSecondary} style={styles.couponWindow}>
        {formatDateWindow(coupon.startsAt, coupon.endsAt, locale, t)}
      </Text>

      <View style={styles.couponActions}>
        <ActionPill
          label={t("practitioner.promoCodes.actions.edit")}
          icon="create-outline"
          onPress={onEdit}
          theme={theme}
        />
        <ActionPill
          label={t("practitioner.promoCodes.actions.disable")}
          icon="ban-outline"
          onPress={onDisable}
          theme={theme}
          variant="danger"
          disabled={!coupon.isActive}
        />
        <ActionPill
          label={t("practitioner.promoCodes.actions.details")}
          icon="receipt-outline"
          onPress={onDetails}
          theme={theme}
        />
      </View>
    </Card>
  );
}

function PromoCodeFormModal({
  visible,
  mode,
  coupon,
  theme,
  t,
  loading,
  onClose,
  onCreate,
  onUpdate,
}: {
  visible: boolean;
  mode: "create" | "edit";
  coupon: PractitionerCouponItem | null;
  theme: ReturnType<typeof useTheme>["theme"];
  t: ReturnType<typeof useTranslation>["t"];
  loading: boolean;
  onClose: () => void;
  onCreate: (values: PractitionerPromoCodeFormValues) => Promise<void>;
  onUpdate: (coupon: PractitionerCouponItem, values: PractitionerPromoCodeFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<PractitionerPromoCodeFormValues>(blankFormValues);
  const [error, setError] = useState<string | null>(null);

  const discountLocked = mode === "edit" && Boolean(coupon?.currentUsageCount);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setError(null);
    if (coupon) {
      setValues({
        code: coupon.code,
        discountValue: coupon.discountValue,
        usageLimitTotal: coupon.usageLimitTotal?.toString() ?? "",
        usageLimitPerPatient: coupon.usageLimitPerPatient?.toString() ?? "",
        startsAt: coupon.startsAt ? coupon.startsAt.slice(0, 10) : "",
        endsAt: coupon.endsAt ? coupon.endsAt.slice(0, 10) : "",
        isActive: coupon.isActive,
      });
      return;
    }

    setValues(blankFormValues);
  }, [coupon, visible]);

  const validationErrors = useMemo(
    () =>
      validatePractitionerPromoCodeForm(values, {
        discountLocked,
      }),
    [discountLocked, values],
  );

  const canSubmit = !loading;

  const submitLabel =
    mode === "create"
      ? t("practitioner.promoCodes.form.createSubmit")
      : t("practitioner.promoCodes.form.updateSubmit");

  const handleCodeChange = (next: string) => {
    setValues((current) => ({
      ...current,
      code: sanitizePractitionerPromoCodeInput(next),
    }));
  };

  const handleDiscountChange = (next: string) => {
    setValues((current) => ({
      ...current,
      discountValue: normalizePercentageInput(next),
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    const errors = validatePractitionerPromoCodeForm(values, {
      discountLocked,
    });

    const firstError = errors.code || errors.discountValue || errors.usageLimitTotal || errors.usageLimitPerPatient || errors.startsAt || errors.endsAt;
    if (firstError) {
      setError(resolveFormErrorMessage(firstError, t));
      return;
    }

    const payloadValues: PractitionerPromoCodeFormValues = {
      ...values,
      code: sanitizePractitionerPromoCodeInput(values.code),
      discountValue: normalizePercentageInput(values.discountValue),
      usageLimitTotal: values.usageLimitTotal.trim(),
      usageLimitPerPatient: values.usageLimitPerPatient.trim(),
      startsAt: values.startsAt.trim(),
      endsAt: values.endsAt.trim(),
      isActive: values.isActive,
    };

    try {
      Keyboard.dismiss();
      if (mode === "create") {
        await onCreate(payloadValues);
      } else if (coupon) {
        await onUpdate(coupon, payloadValues);
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : t("practitioner.promoCodes.errors.generic"));
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text weight="bold" style={styles.modalTitle}>
                {mode === "create"
                  ? t("practitioner.promoCodes.form.createTitle")
                  : t("practitioner.promoCodes.form.editTitle")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.modalSubtitle}>
                {t("practitioner.promoCodes.form.subtitle")}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Card variant="flat" padding="md" style={styles.modalNoteCard}>
              <Text weight="600" style={styles.modalNoteTitle}>
                {t("practitioner.promoCodes.financialNote")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.modalNoteBody}>
                {t("practitioner.promoCodes.form.note")}
              </Text>
            </Card>

            <Input
              label={t("practitioner.promoCodes.form.codeLabel")}
              value={values.code}
              onChangeText={handleCodeChange}
              placeholder={t("practitioner.promoCodes.form.codePlaceholder")}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={mode === "create"}
              helperText={
                mode === "create"
                  ? t("practitioner.promoCodes.form.codeHint")
                  : t("practitioner.promoCodes.form.codeReadOnlyHint")
              }
              error={
                validationErrors.code
                  ? t(`practitioner.promoCodes.form.errors.${validationErrors.code}`)
                  : undefined
              }
            />

            <Input
              label={t("practitioner.promoCodes.form.discountLabel")}
              value={values.discountValue}
              onChangeText={handleDiscountChange}
              placeholder={t("practitioner.promoCodes.form.discountPlaceholder")}
              keyboardType="decimal-pad"
              helperText={
                discountLocked
                  ? t("practitioner.promoCodes.form.discountReadOnlyHint")
                  : t("practitioner.promoCodes.form.discountHint")
              }
              error={
                validationErrors.discountValue
                  ? t(`practitioner.promoCodes.form.errors.${validationErrors.discountValue}`)
                  : undefined
              }
              editable={!discountLocked}
            />

            <Input
              label={t("practitioner.promoCodes.form.totalLimitLabel")}
              value={values.usageLimitTotal}
              onChangeText={(next) =>
                setValues((current) => ({ ...current, usageLimitTotal: next }))
              }
              placeholder={t("practitioner.promoCodes.form.totalLimitPlaceholder")}
              keyboardType="number-pad"
              helperText={t("practitioner.promoCodes.form.totalLimitHint")}
              error={
                validationErrors.usageLimitTotal
                  ? t(`practitioner.promoCodes.form.errors.${validationErrors.usageLimitTotal}`)
                  : undefined
              }
            />

            <Input
              label={t("practitioner.promoCodes.form.patientLimitLabel")}
              value={values.usageLimitPerPatient}
              onChangeText={(next) =>
                setValues((current) => ({ ...current, usageLimitPerPatient: next }))
              }
              placeholder={t("practitioner.promoCodes.form.patientLimitPlaceholder")}
              keyboardType="number-pad"
              helperText={t("practitioner.promoCodes.form.patientLimitHint")}
              error={
                validationErrors.usageLimitPerPatient
                  ? t(`practitioner.promoCodes.form.errors.${validationErrors.usageLimitPerPatient}`)
                  : undefined
              }
            />

            <Input
              label={t("practitioner.promoCodes.form.startsAtLabel")}
              value={values.startsAt}
              onChangeText={(next) =>
                setValues((current) => ({ ...current, startsAt: next }))
              }
              placeholder={t("practitioner.promoCodes.form.datePlaceholder")}
              helperText={t("practitioner.promoCodes.form.startsAtHint")}
              error={
                validationErrors.startsAt
                  ? t(`practitioner.promoCodes.form.errors.${validationErrors.startsAt}`)
                  : undefined
              }
            />

            <Input
              label={t("practitioner.promoCodes.form.endsAtLabel")}
              value={values.endsAt}
              onChangeText={(next) =>
                setValues((current) => ({ ...current, endsAt: next }))
              }
              placeholder={t("practitioner.promoCodes.form.datePlaceholder")}
              helperText={t("practitioner.promoCodes.form.endsAtHint")}
              error={
                validationErrors.endsAt
                  ? t(`practitioner.promoCodes.form.errors.${validationErrors.endsAt}`)
                  : undefined
              }
            />

            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <Text weight="600" style={styles.toggleLabel}>
                  {t("practitioner.promoCodes.form.activeLabel")}
                </Text>
                <Text color={theme.colors.textSecondary} style={styles.toggleHint}>
                  {t("practitioner.promoCodes.form.activeHint")}
                </Text>
              </View>
              <Switch
                value={values.isActive}
                onValueChange={(next) =>
                  setValues((current) => ({ ...current, isActive: next }))
                }
                trackColor={{
                  false: theme.colors.borderLight,
                  true: theme.colors.primary,
                }}
                thumbColor="#ffffff"
              />
            </View>

            {error ? (
              <Card variant="flat" padding="md" style={styles.inlineErrorCard}>
                <Text color={theme.colors.error} style={styles.inlineErrorText}>
                  {error}
                </Text>
              </Card>
            ) : null}

            <Button
              title={submitLabel}
              onPress={handleSubmit}
              loading={!canSubmit}
            />
            <Button
              title={t("practitioner.common.cancel")}
              variant="secondary"
              onPress={onClose}
              disabled={!canSubmit}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PromoCodeDetailModal({
  visible,
  coupon,
  locale,
  theme,
  t,
  loading,
  error,
  redemptions,
  onClose,
  onRetry,
}: {
  visible: boolean;
  coupon: PractitionerCouponItem | null;
  locale: string;
  theme: ReturnType<typeof useTheme>["theme"];
  t: ReturnType<typeof useTranslation>["t"];
  loading: boolean;
  error: boolean;
  redemptions: PractitionerCouponRedemptionItem[];
  onClose: () => void;
  onRetry: () => void;
}) {
  if (!coupon && !loading && !error) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text weight="bold" style={styles.modalTitle}>
                {t("practitioner.promoCodes.detail.title")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.modalSubtitle}>
                {coupon?.code ?? t("practitioner.promoCodes.detail.loading")}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <LoadingState message={t("practitioner.promoCodes.detail.loading")} />
            ) : error ? (
              <ErrorState
                title={t("practitioner.promoCodes.detail.errorTitle")}
                message={t("practitioner.promoCodes.detail.errorBody")}
                onRetry={onRetry}
              />
            ) : coupon ? (
              <>
                <Card variant="outlined" padding="lg" style={styles.detailHero}>
                  <View style={styles.couponTopRow}>
                    <View style={styles.couponTextWrap}>
                      <Text weight="bold" style={styles.couponCode}>
                        {coupon.code}
                      </Text>
                      <Text color={theme.colors.textSecondary} style={styles.couponSubtitle}>
                        {t("practitioner.promoCodes.list.discount", {
                          value: formatPercentLabel(coupon.discountValue),
                        })}
                      </Text>
                    </View>
                    <StatusChip
                      label={t(`practitioner.promoCodes.status.${coupon.status}`, coupon.status)}
                      tone={resolveCouponStatusTone(coupon.status)}
                      showDot={false}
                    />
                  </View>

                  <View style={styles.couponMetaGrid}>
                    <MetaPill
                      label={t("practitioner.promoCodes.list.usage")}
                      value={coupon.usageLimitTotal ? `${coupon.currentUsageCount} / ${coupon.usageLimitTotal}` : `${coupon.currentUsageCount}`}
                      theme={theme}
                    />
                    <MetaPill
                      label={t("practitioner.promoCodes.list.perPatient")}
                      value={coupon.usageLimitPerPatient ? String(coupon.usageLimitPerPatient) : t("common.notSet", "Not set")}
                      theme={theme}
                    />
                  </View>

                  <Text color={theme.colors.textSecondary} style={styles.couponWindow}>
                    {formatDateWindow(coupon.startsAt, coupon.endsAt, locale, t)}
                  </Text>
                </Card>

                <Card variant="outlined" padding="lg" style={styles.detailSection}>
                  <Text weight="600" style={styles.detailSectionTitle}>
                    {t("practitioner.promoCodes.detail.financeTitle")}
                  </Text>
                  <Text color={theme.colors.textSecondary} style={styles.detailSectionBody}>
                    {t("practitioner.promoCodes.detail.financeBody")}
                  </Text>
                </Card>

                <Card variant="outlined" padding="lg" style={styles.detailSection}>
                  <Text weight="600" style={styles.detailSectionTitle}>
                    {t("practitioner.promoCodes.detail.redemptionsTitle")}
                  </Text>

                  {redemptions.length ? (
                    <View style={styles.redemptionList}>
                      {redemptions.map((item) => (
                        <RedemptionCard
                          key={item.id}
                          item={item}
                          locale={locale}
                          theme={theme}
                          t={t}
                        />
                      ))}
                    </View>
                  ) : (
                    <EmptyState
                      title={t("practitioner.promoCodes.detail.emptyRedemptionsTitle")}
                      description={t("practitioner.promoCodes.detail.emptyRedemptionsBody")}
                      icon={
                        <Ionicons
                          name="receipt-outline"
                          size={48}
                          color={theme.colors.textMuted}
                        />
                      }
                    />
                  )}
                </Card>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function RedemptionCard({
  item,
  locale,
  theme,
  t,
}: {
  item: PractitionerCouponRedemptionItem;
  locale: string;
  theme: ReturnType<typeof useTheme>["theme"];
  t: ReturnType<typeof useTranslation>["t"];
}) {
  return (
    <Card variant="flat" padding="md" style={styles.redemptionCard}>
      <View style={styles.redemptionTopRow}>
        <View style={styles.redemptionText}>
          <Text weight="600" style={styles.redemptionName} numberOfLines={1}>
            {item.patientDisplayName ?? t("practitioner.promoCodes.detail.unknownPatient")}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.redemptionMeta}>
            {formatDateTime(item.redeemedAt, locale)}
          </Text>
        </View>
        <Text weight="600" style={styles.redemptionAmount}>
          {formatMoney(item.discountAmount, item.currencyCode ?? null, locale, t("practitioner.finance.common.currencyUnavailable"))}
        </Text>
      </View>

      <View style={styles.redemptionPairs}>
        <MetaPill label={t("practitioner.promoCodes.detail.grossAmount")} value={formatMoney(item.grossAmount, item.currencyCode ?? null, locale, t("practitioner.finance.common.currencyUnavailable"))} theme={theme} />
        <MetaPill label={t("practitioner.promoCodes.detail.platformShare")} value={formatMoney(item.platformDiscountShare, item.currencyCode ?? null, locale, t("practitioner.finance.common.currencyUnavailable"))} theme={theme} />
        <MetaPill label={t("practitioner.promoCodes.detail.practitionerShare")} value={formatMoney(item.practitionerDiscountShare, item.currencyCode ?? null, locale, t("practitioner.finance.common.currencyUnavailable"))} theme={theme} />
      </View>

      <Text color={theme.colors.textSecondary} style={styles.redemptionFooter}>
        {item.sessionId ? `${t("practitioner.promoCodes.detail.sessionRef")}: ${shortReference(item.sessionId)}` : ""}
        {item.paymentId ? ` • ${t("practitioner.promoCodes.detail.paymentRef")}: ${shortReference(item.paymentId)}` : ""}
      </Text>
    </Card>
  );
}

function MetaPill({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  return (
    <View style={[styles.metaPill, { backgroundColor: theme.colors.surfaceSecondary }]}>
      <Text color={theme.colors.textMuted} style={styles.metaPillLabel}>
        {label}
      </Text>
      <Text weight="600" style={styles.metaPillValue}>
        {value}
      </Text>
    </View>
  );
}

function ActionPill({
  label,
  icon,
  onPress,
  theme,
  variant = "default",
  disabled = false,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
  variant?: "default" | "danger";
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionPill,
        {
          backgroundColor:
            variant === "danger"
              ? `${theme.colors.error}12`
              : theme.colors.surfaceSecondary,
          borderColor:
            variant === "danger"
              ? `${theme.colors.error}25`
              : theme.colors.borderLight,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={variant === "danger" ? theme.colors.error : theme.colors.textPrimary}
      />
      <Text
        weight="600"
        style={styles.actionPillLabel}
        color={variant === "danger" ? theme.colors.error : theme.colors.textPrimary}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function resolveCouponStatusTone(status: PractitionerCouponStatus) {
  switch (status) {
    case "ACTIVE":
    case "APPROVED":
      return "success" as const;
    case "PENDING_REVIEW":
    case "DRAFT":
      return "warning" as const;
    case "EXPIRED":
    case "DISABLED":
    case "REJECTED":
      return "error" as const;
    default:
      return "default" as const;
  }
}

function formatPercentLabel(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return `${value}%`;
  }

  const label = parsed % 1 === 0 ? parsed.toFixed(0) : parsed.toFixed(2);
  return `${label}%`;
}

function formatMoney(
  amount: string,
  currencyCode: string | null | undefined,
  locale: string,
  fallbackText = "-",
) {
  const parsed = Number(amount);
  const normalizedCurrencyCode = currencyCode?.trim().toUpperCase();
  if (!Number.isFinite(parsed) || !normalizedCurrencyCode) {
    return fallbackText;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizedCurrencyCode,
    maximumFractionDigits: 2,
  }).format(parsed);
}

function formatDateWindow(
  startsAt: string | null,
  endsAt: string | null,
  locale: string,
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (!startsAt && !endsAt) {
    return t("practitioner.promoCodes.list.noDateWindow");
  }

  if (startsAt && endsAt) {
    return t("practitioner.promoCodes.list.dateRange", {
      start: formatDateTime(startsAt, locale),
      end: formatDateTime(endsAt, locale),
    });
  }

  if (startsAt) {
    return t("practitioner.promoCodes.list.startsAt", {
      value: formatDateTime(startsAt, locale),
    });
  }

  return t("practitioner.promoCodes.list.endsAt", {
    value: formatDateTime(endsAt, locale),
  });
}

function shortReference(value: string) {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function blankFormValues(): PractitionerPromoCodeFormValues {
  return {
    code: "",
    discountValue: "",
    usageLimitTotal: "",
    usageLimitPerPatient: "",
    startsAt: "",
    endsAt: "",
    isActive: true,
  };
}

function resolveFormErrorMessage(
  errorKind: string,
  t: ReturnType<typeof useTranslation>["t"],
) {
  switch (errorKind) {
    case "required":
      return t("practitioner.promoCodes.form.errors.required");
    case "invalid":
      return t("practitioner.promoCodes.form.errors.invalid");
    case "tooHigh":
      return t("practitioner.promoCodes.form.errors.tooHigh");
    case "invalidRange":
      return t("practitioner.promoCodes.form.errors.invalidRange");
    case "locked":
      return t("practitioner.promoCodes.form.errors.locked");
    default:
      return t("practitioner.promoCodes.errors.generic");
  }
}

function mapCouponError(error: unknown, t: ReturnType<typeof useTranslation>["t"]) {
  const message = extractApiErrorMessage(error);
  const kind = classifyPractitionerPromoCodeError(message);

  switch (kind) {
    case "duplicateCode":
      return new Error(t("practitioner.promoCodes.errors.duplicateCode"));
    case "invalidCode":
      return new Error(t("practitioner.promoCodes.errors.invalidCode"));
    case "discountTooHigh":
      return new Error(t("practitioner.promoCodes.errors.discountTooHigh"));
    case "percentageOnly":
      return new Error(t("practitioner.promoCodes.errors.percentageOnly"));
    case "invalidDateRange":
      return new Error(t("practitioner.promoCodes.errors.invalidDateRange"));
    case "usageLimitBelowCurrentUsage":
      return new Error(t("practitioner.promoCodes.errors.usageLimitBelowCurrentUsage"));
    case "notPractitioner":
      return new Error(t("practitioner.promoCodes.errors.notPractitioner"));
    case "notFound":
      return new Error(t("practitioner.promoCodes.errors.notFound"));
    default:
      return new Error(t("practitioner.promoCodes.errors.generic"));
  }
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 14,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerAction: {
    padding: 8,
  },
  heroCard: {
    gap: 14,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 24,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
  },
  heroNote: {
    fontSize: 13,
    lineHeight: 20,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8f4f2",
  },
  feedbackCard: {
    gap: 8,
  },
  feedbackRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  feedbackTitle: {
    fontSize: 16,
  },
  feedbackBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  couponCard: {
    gap: 12,
  },
  couponTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  couponTextWrap: {
    flex: 1,
  },
  couponCode: {
    fontSize: 18,
    marginBottom: 4,
  },
  couponSubtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  couponMetaGrid: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  metaPill: {
    minWidth: "48%",
    flexGrow: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaPillLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  metaPillValue: {
    fontSize: 14,
  },
  couponWindow: {
    fontSize: 13,
    lineHeight: 20,
  },
  couponActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionPill: {
    flexGrow: 1,
    flexBasis: "30%",
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  actionPillLabel: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
  },
  modalHandle: {
    alignSelf: "center",
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#d9e0e6",
    marginBottom: 10,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalCloseButton: {
    padding: 8,
    marginTop: -2,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 14,
  },
  modalNoteCard: {
    gap: 8,
  },
  modalNoteTitle: {
    fontSize: 15,
  },
  modalNoteBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    marginBottom: 3,
  },
  toggleHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  inlineErrorCard: {
    backgroundColor: "#fef3f2",
  },
  inlineErrorText: {
    fontSize: 13,
    lineHeight: 20,
  },
  detailHero: {
    gap: 12,
  },
  detailSection: {
    gap: 12,
  },
  detailSectionTitle: {
    fontSize: 16,
  },
  detailSectionBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  redemptionList: {
    gap: 10,
  },
  redemptionCard: {
    gap: 10,
  },
  redemptionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  redemptionText: {
    flex: 1,
  },
  redemptionName: {
    fontSize: 15,
  },
  redemptionMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  redemptionAmount: {
    fontSize: 15,
  },
  redemptionPairs: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  redemptionFooter: {
    fontSize: 12,
    lineHeight: 18,
  },
});
