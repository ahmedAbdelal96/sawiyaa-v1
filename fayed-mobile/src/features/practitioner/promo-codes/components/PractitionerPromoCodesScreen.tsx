import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
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
  formatDate,
  formatDateTime,
} from "../../../../components/ui";
import { FilterChip } from "../../../../components/ui/FilterChip";
import { SearchBar } from "../../../../components/ui/SearchBar";
import { useTheme } from "../../../../providers/ThemeProvider";
import { extractApiErrorMessage } from "../../../../lib/api";
import {
  buildCreatePractitionerCouponRequest,
  buildUpdatePractitionerCouponRequest,
  classifyPractitionerPromoCodeError,
  normalizePercentageInput,
  parsePractitionerPromoCodeDate,
  sanitizePractitionerPromoCodeInput,
  serializePractitionerPromoCodeDate,
  validatePractitionerPromoCodeForm,
  type PractitionerPromoCodeDateField,
  type PractitionerPromoCodeFormValues,
} from "../coupon-utils";
import {
  useActivatePractitionerCoupon,
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
  PractitionerCouponEffectiveStatus,
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

const DEFAULT_LIST_LIMIT = 20;
const DEFAULT_REDEMPTION_LIMIT = 20;
const STATUS_FILTERS: ("ALL" | "ACTIVE" | "DISABLED" | "EXPIRED")[] = [
  "ALL",
  "ACTIVE",
  "DISABLED",
  "EXPIRED",
];
export default function PractitionerPromoCodesScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const [panelMode, setPanelMode] = useState<PanelMode>("none");
  const [activeCouponId, setActiveCouponId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ScreenFeedback>(null);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DISABLED" | "EXPIRED">("ALL");

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchDraft.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const listQuery = usePractitionerCoupons({
    page,
    limit: DEFAULT_LIST_LIMIT,
    ...(searchQuery ? { q: searchQuery } : {}),
    ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
  });
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
  const activateMutation = useActivatePractitionerCoupon();
  const [items, setItems] = useState<PractitionerCouponItem[]>([]);
  const [pendingAction, setPendingAction] = useState<{
    couponId: string;
    kind: "disable" | "activate";
  } | null>(null);

  const selectedCoupon = useMemo(() => {
    if (!activeCouponId) {
      return null;
    }

    return (
      detailQuery.data?.item ??
      items.find((item) => item.id === activeCouponId) ??
      null
    );
  }, [activeCouponId, detailQuery.data?.item, items]);

  const isInitialLoading = listQuery.isLoading && items.length === 0;
  const listError = listQuery.isError && items.length === 0;

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

  const refreshList = () => {
    setItems([]);
    setPage(1);
    listQuery.refetch();
  };

  useEffect(() => {
    if (panelMode === "none") {
      return;
    }

    setFeedback(null);
  }, [panelMode]);

  useEffect(() => {
    setItems([]);
    setPage(1);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    if (!listQuery.data) {
      return;
    }

    setItems((current) => {
      if (page === 1) {
        return listQuery.data.items;
      }

      const seen = new Set(current.map((item) => item.id));
      const next = [...current];
      for (const item of listQuery.data.items) {
        if (!seen.has(item.id)) {
          next.push(item);
        }
      }
      return next;
    });
  }, [listQuery.data, page]);

  const hasMore = useMemo(() => {
    if (!listQuery.data) {
      return false;
    }

    return page < listQuery.data.pagination.totalPages;
  }, [listQuery.data, page]);

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
    void (async () => {
      try {
        setPendingAction({ couponId: coupon.id, kind: "disable" });
        await disableMutation.mutateAsync(coupon.id);
        setFeedback({
          tone: "warning",
          title: t("practitioner.promoCodes.notifications.disabledTitle"),
          body: t("practitioner.promoCodes.notifications.disabledBody", {
            code: coupon.code,
          }),
        });
      } catch (error) {
        console.error("[practitioner-promo-codes] disable failed", error);
        setFeedback({
          tone: "warning",
          title: t("practitioner.promoCodes.notifications.actionFailedTitle"),
          body: t("practitioner.promoCodes.notifications.actionFailedBody"),
        });
      } finally {
        setPendingAction(null);
      }
    })();
  };

  const handleActivate = (coupon: PractitionerCouponItem) => {
    void (async () => {
      try {
        setPendingAction({ couponId: coupon.id, kind: "activate" });
        await activateMutation.mutateAsync(coupon.id);
        setFeedback({
          tone: "success",
          title: t("practitioner.promoCodes.notifications.activatedTitle"),
          body: t("practitioner.promoCodes.notifications.activatedBody", {
            code: coupon.code,
          }),
        });
      } catch (error) {
        console.error("[practitioner-promo-codes] activate failed", error);
        setFeedback({
          tone: "warning",
          title: t("practitioner.promoCodes.notifications.actionFailedTitle"),
          body: t("practitioner.promoCodes.notifications.actionFailedBody"),
        });
      } finally {
        setPendingAction(null);
      }
    })();
  };

  if (isInitialLoading) {
    return (
      <Screen bg="background">
        <Header
          title={t("practitioner.promoCodes.title")}
          showBack
          rightElement={
            <TouchableOpacity onPress={refreshList} style={styles.headerAction}>
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
            <TouchableOpacity onPress={refreshList} style={styles.headerAction}>
              <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          }
        />
        <ErrorState
          fullScreen
          title={t("practitioner.promoCodes.errorTitle")}
          message={t("practitioner.promoCodes.errorBody")}
          onRetry={refreshList}
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
            <TouchableOpacity onPress={refreshList} style={styles.headerAction}>
              <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={listQuery.isRefetching}
            onRefresh={refreshList}
            tintColor={theme.colors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card variant="outlined" padding="sm" style={styles.toolbarCard}>
          <View style={styles.toolbarHeader}>
            <View style={styles.toolbarTextWrap}>
              <Text weight="bold" style={styles.toolbarTitle}>
                {t("practitioner.promoCodes.title")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.toolbarSubtitle}>
                {t("practitioner.promoCodes.subtitle")}
              </Text>
            </View>
            <Button
              title={t("practitioner.promoCodes.createCta")}
              onPress={openCreate}
              variant="secondary"
              style={styles.createButton}
            />
          </View>

          <Text color={theme.colors.textSecondary} style={styles.toolbarNote}>
            {t("practitioner.promoCodes.financialNote")}
          </Text>

          <SearchBar
            value={searchDraft}
            onChangeText={setSearchDraft}
            onClear={() => setSearchDraft("")}
            placeholder={t("practitioner.promoCodes.searchPlaceholder")}
          />

          <View style={styles.filterBlock}>
            <Text weight="600" style={styles.filterLabel}>
              {t("practitioner.promoCodes.filters.status")}
            </Text>
            <View style={styles.chipRow}>
              {STATUS_FILTERS.map((status) => (
                <FilterChip
                  key={status}
                  label={
                    status === "ALL"
                      ? t("practitioner.promoCodes.filters.all")
                      : resolveCouponStatusLabel(status, t)
                  }
                  selected={statusFilter === status}
                  onPress={() => setStatusFilter(status)}
                />
              ))}
            </View>
          </View>
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

        {items.length ? (
          <View style={styles.list}>
            {items.map((coupon) => (
              <CouponCard
                key={coupon.id}
                coupon={coupon}
                locale={locale}
                theme={theme}
                t={t}
                pendingAction={pendingAction}
                onEdit={() => openEdit(coupon.id)}
                onDisable={() => handleDisable(coupon)}
                onActivate={() => handleActivate(coupon)}
                onDetails={() => openDetails(coupon.id)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title={t("practitioner.promoCodes.empty.title")}
            description={t("practitioner.promoCodes.empty.body")}
            icon={
              <Ionicons
                name="pricetag-outline"
                size={48}
                color={theme.colors.textMuted}
              />
            }
            />
          )}

        {hasMore ? (
          <Button
            title={listQuery.isFetching ? t("practitioner.finance.common.loadingMore") : t("practitioner.finance.common.loadMore")}
            onPress={() => setPage((current) => current + 1)}
            variant="secondary"
            disabled={listQuery.isFetching}
          />
        ) : null}
      </ScrollView>

      <PromoCodeFormModal
        visible={panelMode === "create" || panelMode === "edit"}
        mode={panelMode === "edit" ? "edit" : "create"}
        coupon={selectedCoupon}
        locale={locale}
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
  pendingAction,
  onEdit,
  onDisable,
  onActivate,
  onDetails,
}: {
  coupon: PractitionerCouponItem;
  locale: string;
  theme: ReturnType<typeof useTheme>["theme"];
  t: ReturnType<typeof useTranslation>["t"];
  pendingAction: { couponId: string; kind: "disable" | "activate" } | null;
  onEdit: () => void;
  onDisable: () => void;
  onActivate: () => void;
  onDetails: () => void;
}) {
  const displayStatus = coupon.effectiveStatus ?? coupon.status;
  const statusTone = resolveCouponStatusTone(displayStatus);
  const usageLabel = formatUsageLabel(coupon.currentUsageCount, coupon.usageLimitTotal, t);
  const patientLimitLabel = formatPatientLimitLabel(
    coupon.usageLimitPerPatient,
    t,
  );
  const canDisable =
    displayStatus === "ACTIVE" || displayStatus === "NOT_STARTED";
  const canActivate = displayStatus === "DISABLED";
  const isRowPending = pendingAction?.couponId === coupon.id;
  const disablePending =
    pendingAction?.couponId === coupon.id && pendingAction?.kind === "disable";
  const activatePending =
    pendingAction?.couponId === coupon.id && pendingAction?.kind === "activate";

  const actions = [
    {
      kind: "details" as const,
      label: t("practitioner.promoCodes.actions.details"),
      icon: "receipt-outline" as const,
      onPress: onDetails,
      variant: "default" as const,
    },
    {
      kind: "edit" as const,
      label: t("practitioner.promoCodes.actions.edit"),
      icon: "create-outline" as const,
      onPress: onEdit,
      variant: "default" as const,
    },
    canDisable
      ? {
          kind: "disable" as const,
          label: t("practitioner.promoCodes.actions.disable"),
          icon: "ban-outline" as const,
          onPress: onDisable,
          variant: "danger" as const,
        }
      : null,
    canActivate
      ? {
          kind: "activate" as const,
          label: t("practitioner.promoCodes.actions.activate"),
          icon: "checkmark-circle-outline" as const,
          onPress: onActivate,
          variant: "success" as const,
        }
      : null,
  ].filter(Boolean) as {
    kind: "details" | "edit" | "disable" | "activate";
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    variant: "default" | "danger" | "success";
  }[];

  return (
    <Card variant="outlined" padding="sm" style={styles.couponCard}>
      <View style={styles.couponTopRow}>
        <View style={styles.couponTextWrap}>
          <Text weight="700" style={styles.couponCode} numberOfLines={1}>
            {coupon.code}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.couponSubtitle}>
            {t("practitioner.promoCodes.list.discount", {
              value: formatPercentLabel(coupon.discountValue),
            })}
          </Text>
        </View>
        <StatusChip
          label={resolveCouponStatusLabel(displayStatus, t)}
          tone={statusTone}
          showDot={false}
        />
      </View>

      <Text color={theme.colors.textSecondary} style={styles.couponUsageLine} numberOfLines={1}>
        {usageLabel} · {t("practitioner.promoCodes.list.perPatient")}: {patientLimitLabel}
      </Text>

      <Text color={theme.colors.textSecondary} style={styles.couponWindow} numberOfLines={1}>
        {formatDateWindow(coupon.startsAt, coupon.endsAt, locale, t)}
      </Text>

      <View style={styles.couponActions}>
        {actions.map((action) => (
          <ActionPill
            key={action.kind}
            label={action.label}
            icon={action.icon}
            onPress={action.onPress}
            theme={theme}
            variant={action.variant}
            loading={
              (action.kind === "disable" && disablePending) ||
              (action.kind === "activate" && activatePending)
            }
            disabled={isRowPending}
          />
        ))}
      </View>
    </Card>
  );
}

function PromoCodeFormModal({
  visible,
  mode,
  coupon,
  locale,
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
  locale: string;
  theme: ReturnType<typeof useTheme>["theme"];
  t: ReturnType<typeof useTranslation>["t"];
  loading: boolean;
  onClose: () => void;
  onCreate: (values: PractitionerPromoCodeFormValues) => Promise<void>;
  onUpdate: (coupon: PractitionerCouponItem, values: PractitionerPromoCodeFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<PractitionerPromoCodeFormValues>(blankFormValues);
  const [error, setError] = useState<string | null>(null);
  const [datePickerState, setDatePickerState] = useState<{
    field: PractitionerPromoCodeDateField;
    value: Date | null;
  } | null>(null);

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

  const clearSubmissionError = () => setError(null);

  const openDatePicker = (field: PractitionerPromoCodeDateField) => {
    clearSubmissionError();
    setDatePickerState({
      field,
      value: parsePractitionerPromoCodeDate(values[field]),
    });
  };

  const closeDatePicker = () => {
    setDatePickerState(null);
  };

  const confirmDatePicker = (date: Date) => {
    if (!datePickerState) {
      return;
    }

    setValues((current) => ({
      ...current,
      [datePickerState.field]: serializePractitionerPromoCodeDate(
        date,
        datePickerState.field,
      ),
    }));
    clearSubmissionError();
    setDatePickerState(null);
  };

  const clearDateField = (field: PractitionerPromoCodeDateField) => {
    setValues((current) => ({ ...current, [field]: "" }));
    clearSubmissionError();
  };

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
    clearSubmissionError();
    setValues((current) => ({
      ...current,
      code: sanitizePractitionerPromoCodeInput(next),
    }));
  };

  const handleDiscountChange = (next: string) => {
    clearSubmissionError();
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
              onChangeText={(next) => {
                clearSubmissionError();
                setValues((current) => ({ ...current, usageLimitTotal: next }));
              }}
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
              onChangeText={(next) => {
                clearSubmissionError();
                setValues((current) => ({ ...current, usageLimitPerPatient: next }));
              }}
              placeholder={t("practitioner.promoCodes.form.patientLimitPlaceholder")}
              keyboardType="number-pad"
              helperText={t("practitioner.promoCodes.form.patientLimitHint")}
              error={
                validationErrors.usageLimitPerPatient
                  ? t(`practitioner.promoCodes.form.errors.${validationErrors.usageLimitPerPatient}`)
                  : undefined
              }
            />

            <PromoCodeDateField
              label={t("practitioner.promoCodes.form.startsAtLabel")}
              value={values.startsAt}
              placeholder={t("practitioner.promoCodes.form.startsAtPlaceholder")}
              helperText={t("practitioner.promoCodes.form.startsAtHint")}
              error={
                validationErrors.startsAt
                  ? t(`practitioner.promoCodes.form.errors.${validationErrors.startsAt}`)
                  : undefined
              }
              onPress={() => openDatePicker("startsAt")}
              onClear={() => clearDateField("startsAt")}
              locale={locale}
              theme={theme}
            />

            <PromoCodeDateField
              label={t("practitioner.promoCodes.form.endsAtLabel")}
              value={values.endsAt}
              placeholder={t("practitioner.promoCodes.form.endsAtPlaceholder")}
              helperText={t("practitioner.promoCodes.form.endsAtHint")}
              error={
                validationErrors.endsAt
                  ? t(`practitioner.promoCodes.form.errors.${validationErrors.endsAt}`)
                  : undefined
              }
              onPress={() => openDatePicker("endsAt")}
              onClear={() => clearDateField("endsAt")}
              locale={locale}
              theme={theme}
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
                onValueChange={(next) => {
                  clearSubmissionError();
                  setValues((current) => ({ ...current, isActive: next }));
                }}
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

      <PromoCodeDatePickerModal
        visible={Boolean(datePickerState)}
        value={datePickerState?.value ?? null}
        locale={locale}
        title={
          datePickerState?.field === "startsAt"
            ? t("practitioner.promoCodes.form.startsAtLabel")
            : t("practitioner.promoCodes.form.endsAtLabel")
        }
        t={t}
        onClose={closeDatePicker}
        onConfirm={confirmDatePicker}
        onClear={
          datePickerState?.field
            ? () => {
                clearDateField(datePickerState.field);
                closeDatePicker();
              }
            : undefined
        }
      />
    </Modal>
  );
}

function PromoCodeDateField({
  label,
  value,
  placeholder,
  helperText,
  error,
  onPress,
  onClear,
  locale,
  theme,
}: {
  label: string;
  value: string;
  placeholder: string;
  helperText: string;
  error?: string;
  onPress: () => void;
  onClear: () => void;
  locale: string;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const displayValue = value ? formatDate(value, locale) : "";
  const hasValue = Boolean(displayValue);

  return (
    <View style={styles.dateFieldWrap}>
      <Text weight="500" color={theme.colors.textSecondary} style={styles.dateFieldLabel}>
        {label}
      </Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[
          styles.dateFieldButton,
          {
            borderColor: error ? "#ef4444" : theme.colors.borderLight,
            backgroundColor: theme.colors.surface,
            flexDirection: locale.startsWith("ar") ? "row-reverse" : "row",
          },
        ]}
      >
        <Text
          style={[
            styles.dateFieldValue,
            {
              color: hasValue ? theme.colors.textPrimary : theme.colors.textMuted,
              textAlign: locale.startsWith("ar") ? "right" : "left",
            },
          ]}
          numberOfLines={1}
        >
          {hasValue ? displayValue : placeholder}
        </Text>
        <View style={styles.dateFieldActions}>
          {hasValue ? (
            <TouchableOpacity
              onPress={onClear}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={label}
              style={styles.dateFieldActionButton}
            >
              <Ionicons
                name="close-circle-outline"
                size={18}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          ) : null}
          <Ionicons
            name="calendar-outline"
            size={18}
            color={theme.colors.textMuted}
          />
        </View>
      </TouchableOpacity>
      {error ? (
        <Text color="#ef4444" style={styles.dateFieldError}>
          {error}
        </Text>
      ) : (
        <Text color={theme.colors.textMuted} style={styles.dateFieldHelper}>
          {helperText}
        </Text>
      )}
    </View>
  );
}

const WEEKDAY_LABELS_AR = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];
const WEEKDAY_LABELS_EN = ["S", "M", "T", "W", "T", "F", "S"];

function createCalendarDate(year: number, month: number, day: number) {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function startOfCalendarMonth(date: Date) {
  return createCalendarDate(date.getFullYear(), date.getMonth(), 1);
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getWeekStartIndex(locale: string) {
  return locale.startsWith("ar") ? 6 : 0;
}

function getWeekdayLabels(locale: string) {
  return locale.startsWith("ar") ? WEEKDAY_LABELS_AR : WEEKDAY_LABELS_EN;
}

function buildMonthGrid(viewDate: Date, locale: string) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const weekStartIndex = getWeekStartIndex(locale);
  const monthStart = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyCells = (monthStart.getDay() - weekStartIndex + 7) % 7;
  const totalCells = Math.ceil((leadingEmptyCells + daysInMonth) / 7) * 7;
  const cells: Array<Date | null> = [];

  for (let index = 0; index < totalCells; index += 1) {
    if (index < leadingEmptyCells || index >= leadingEmptyCells + daysInMonth) {
      cells.push(null);
      continue;
    }

    const day = index - leadingEmptyCells + 1;
    cells.push(createCalendarDate(year, month, day));
  }

  const rows: Array<Array<Date | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    rows.push(cells.slice(index, index + 7));
  }

  return rows;
}

function getMonthYearLabel(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date);
}

function PromoCodeDatePickerModal({
  visible,
  value,
  locale,
  title,
  t,
  onClose,
  onConfirm,
  onClear,
}: {
  visible: boolean;
  value: Date | null;
  locale: string;
  title: string;
  t: ReturnType<typeof useTranslation>["t"];
  onClose: () => void;
  onConfirm: (date: Date) => void;
  onClear?: () => void;
}) {
  const { theme } = useTheme();
  const isArabic = locale.startsWith("ar");
  const initialSelectedDate = value ? new Date(value) : null;
  const [viewDate, setViewDate] = useState(() =>
    startOfCalendarMonth(initialSelectedDate ?? new Date()),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialSelectedDate);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const next = value ? new Date(value) : null;
    setViewDate(startOfCalendarMonth(next ?? new Date()));
    setSelectedDate(next);
  }, [value, visible]);

  const monthYearLabel = useMemo(
    () => getMonthYearLabel(viewDate, locale),
    [locale, viewDate],
  );
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);
  const calendarRows = useMemo(() => buildMonthGrid(viewDate, locale), [locale, viewDate]);
  const today = useMemo(
    () =>
      createCalendarDate(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate(),
      ),
    [],
  );

  const navigateMonth = (offset: number) => {
    setViewDate((current) =>
      startOfCalendarMonth(createCalendarDate(current.getFullYear(), current.getMonth() + offset, 1)),
    );
  };

  const confirmSelection = () => {
    if (!selectedDate) {
      return;
    }

    onConfirm(selectedDate);
  };

  const clearSelection = () => {
    onClear?.();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.datePickerOverlay}>
        <View style={[styles.datePickerSheet, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.datePickerTopBar}>
            <Text weight="700" style={styles.datePickerTitle}>
              {title}
            </Text>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={8}
              style={[styles.datePickerTopButton, styles.datePickerCloseButton]}
            >
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.datePickerBody}>
            <View style={styles.calendarHeader}>
              <Pressable
                onPress={() => navigateMonth(isArabic ? 1 : -1)}
                accessibilityRole="button"
                accessibilityLabel={isArabic ? "????? ??????" : "Previous month"}
                style={({ pressed }) => [
                  styles.calendarNavButton,
                  {
                    backgroundColor: theme.colors.surfaceSecondary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={isArabic ? "chevron-forward" : "chevron-back"}
                  size={18}
                  color={theme.colors.textPrimary}
                />
              </Pressable>

              <Text weight="700" style={styles.calendarMonthLabel}>
                {monthYearLabel}
              </Text>

              <Pressable
                onPress={() => navigateMonth(isArabic ? -1 : 1)}
                accessibilityRole="button"
                accessibilityLabel={isArabic ? "????? ??????" : "Next month"}
                style={({ pressed }) => [
                  styles.calendarNavButton,
                  {
                    backgroundColor: theme.colors.surfaceSecondary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={isArabic ? "chevron-back" : "chevron-forward"}
                  size={18}
                  color={theme.colors.textPrimary}
                />
              </Pressable>
            </View>

            <View style={styles.calendarWeekdays}>
              {weekdayLabels.map((label) => (
                <Text
                  key={label}
                  weight="600"
                  color={theme.colors.textSecondary}
                  style={styles.calendarWeekdayLabel}
                >
                  {label}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarRows.map((week, weekIndex) => (
                <View key={weekIndex} style={styles.calendarWeekRow}>
                  {week.map((day, dayIndex) => {
                    const key = `${weekIndex}-${dayIndex}`;
                    if (!day) {
                      return <View key={key} style={styles.calendarEmptyCell} />;
                    }

                    const selected = selectedDate ? isSameCalendarDay(selectedDate, day) : false;
                    const isToday = isSameCalendarDay(today, day);

                    return (
                      <Pressable
                        key={key}
                        onPress={() => setSelectedDate(day)}
                        accessibilityRole="button"
                        accessibilityLabel={formatDate(
                          serializePractitionerPromoCodeDate(day, "startsAt"),
                          locale,
                        )}
                        style={({ pressed }) => [
                          styles.calendarDayCell,
                          {
                            borderColor: selected
                              ? theme.colors.primary
                              : isToday
                                ? theme.colors.primary
                                : theme.colors.borderLight,
                            backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                            opacity: pressed ? 0.88 : 1,
                          },
                        ]}
                      >
                        <Text
                          weight={selected ? "700" : "600"}
                          style={[
                            styles.calendarDayLabel,
                            {
                              color: selected ? "#ffffff" : theme.colors.textPrimary,
                            },
                          ]}
                        >
                          {day.getDate()}
                        </Text>
                        <View
                          style={[
                            styles.calendarDayMarker,
                            {
                              backgroundColor: selected
                                ? "rgba(255,255,255,0.95)"
                                : isToday
                                  ? theme.colors.primary
                                  : "transparent",
                            },
                          ]}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.datePickerFooter}>
            {onClear ? (
              <TouchableOpacity
                onPress={clearSelection}
                style={styles.datePickerClearButton}
                activeOpacity={0.8}
              >
                <Text weight="600" color={theme.colors.textSecondary}>
                  {t("practitioner.promoCodes.form.datePicker.clear")}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.datePickerClearButton} />
            )}

            <View style={styles.datePickerFooterActions}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.datePickerFooterButton, styles.datePickerFooterGhostButton]}
                activeOpacity={0.8}
              >
                <Text weight="600" color={theme.colors.textSecondary}>
                  {t("practitioner.promoCodes.form.datePicker.cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmSelection}
                disabled={!selectedDate}
                style={[
                  styles.datePickerFooterButton,
                  styles.datePickerFooterPrimaryButton,
                  !selectedDate ? styles.datePickerFooterDisabledButton : null,
                ]}
                activeOpacity={0.85}
              >
                <Text weight="700" color="#ffffff">
                  {t("practitioner.promoCodes.form.datePicker.confirm")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
                <Card variant="outlined" padding="sm" style={styles.detailHero}>
                  <View style={styles.couponTopRow}>
                    <View style={styles.couponTextWrap}>
                      <Text weight="700" style={styles.couponCode} numberOfLines={1}>
                        {coupon.code}
                      </Text>
                      <Text color={theme.colors.textSecondary} style={styles.couponSubtitle}>
                        {t("practitioner.promoCodes.list.discount", {
                          value: formatPercentLabel(coupon.discountValue),
                        })}
                      </Text>
                    </View>
                    <StatusChip
                      label={resolveCouponStatusLabel(
                        coupon.effectiveStatus ?? coupon.status,
                        t,
                      )}
                      tone={resolveCouponStatusTone(
                        coupon.effectiveStatus ?? coupon.status,
                      )}
                      showDot={false}
                    />
                  </View>

                  <Text color={theme.colors.textSecondary} style={styles.couponUsageLine} numberOfLines={1}>
                    {formatUsageLabel(coupon.currentUsageCount, coupon.usageLimitTotal, t)} · {t("practitioner.promoCodes.list.perPatient")}: {formatPatientLimitLabel(coupon.usageLimitPerPatient, t)}
                  </Text>

                  <Text color={theme.colors.textSecondary} style={styles.couponWindow} numberOfLines={1}>
                    {formatDateWindow(coupon.startsAt, coupon.endsAt, locale, t)}
                  </Text>
                </Card>

                <Card variant="outlined" padding="sm" style={styles.detailSection}>
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
    <Card variant="flat" padding="sm" style={styles.redemptionCard}>
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
        <MetaPill
          label={t("practitioner.promoCodes.detail.grossAmount")}
          value={formatMoney(
            item.grossAmount,
            item.currencyCode ?? null,
            locale,
            t("practitioner.finance.common.currencyUnavailable"),
          )}
          theme={theme}
        />
        <MetaPill
          label={t("practitioner.promoCodes.detail.platformShare")}
          value={formatMoney(
            item.platformDiscountShare,
            item.currencyCode ?? null,
            locale,
            t("practitioner.finance.common.currencyUnavailable"),
          )}
          theme={theme}
        />
      </View>

      <Text color={theme.colors.textSecondary} style={styles.redemptionFooter}>
        {formatDateTime(item.createdAt, locale)}
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
  loading = false,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
  variant?: "default" | "danger" | "success";
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={() => {
        if (disabled || loading) {
          return;
        }

        onPress();
      }}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      hitSlop={6}
      style={[
        styles.actionPill,
        {
          backgroundColor:
            variant === "danger"
              ? `${theme.colors.error}12`
              : variant === "success"
                ? `${theme.colors.success}12`
                : theme.colors.surfaceSecondary,
          borderColor:
            variant === "danger"
              ? `${theme.colors.error}25`
              : variant === "success"
                ? `${theme.colors.success}25`
                : theme.colors.borderLight,
          opacity: disabled || loading ? 0.55 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "danger"
              ? theme.colors.error
              : variant === "success"
                ? theme.colors.success
                : theme.colors.textPrimary
          }
        />
      ) : (
        <Ionicons
          name={icon}
          size={16}
          color={
            variant === "danger"
              ? theme.colors.error
              : variant === "success"
                ? theme.colors.success
                : theme.colors.textPrimary
          }
        />
      )}
      <Text
        weight="600"
        style={styles.actionPillLabel}
        color={
          variant === "danger"
            ? theme.colors.error
            : variant === "success"
              ? theme.colors.success
              : theme.colors.textPrimary
        }
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function resolveCouponStatusTone(
  status: PractitionerCouponStatus | PractitionerCouponEffectiveStatus,
) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "EXPIRED":
    case "NOT_STARTED":
    case "USAGE_LIMIT_REACHED":
      return "warning" as const;
    case "DISABLED":
      return "error" as const;
    default:
      return "default" as const;
  }
}

function resolveCouponStatusLabel(
  status: PractitionerCouponStatus | PractitionerCouponEffectiveStatus,
  t: ReturnType<typeof useTranslation>["t"],
) {
  switch (status) {
    case "ACTIVE":
      return t("practitioner.promoCodes.status.ACTIVE");
    case "EXPIRED":
      return t("practitioner.promoCodes.status.EXPIRED");
    case "DISABLED":
      return t("practitioner.promoCodes.status.DISABLED");
    case "NOT_STARTED":
      return t("practitioner.promoCodes.status.NOT_STARTED");
    case "USAGE_LIMIT_REACHED":
      return t("practitioner.promoCodes.status.USAGE_LIMIT_REACHED");
    default:
      return t(`practitioner.promoCodes.status.${status}`);
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

function formatUsageLabel(
  currentUsageCount: number,
  usageLimitTotal: number | null,
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (usageLimitTotal) {
    return t("practitioner.promoCodes.list.usageWithLimit", {
      current: currentUsageCount,
      total: usageLimitTotal,
    });
  }

  return t("practitioner.promoCodes.list.usageWithoutLimit", {
    current: currentUsageCount,
  });
}

function formatPatientLimitLabel(
  usageLimitPerPatient: number | null,
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (usageLimitPerPatient) {
    return String(usageLimitPerPatient);
  }

  return t("common.notSet");
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerAction: {
    padding: 8,
  },
  toolbarCard: {
    gap: 6,
  },
  toolbarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  toolbarTextWrap: {
    flex: 1,
    gap: 2,
  },
  toolbarTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  toolbarSubtitle: {
    fontSize: 10,
    lineHeight: 14,
  },
  toolbarNote: {
    fontSize: 9,
    lineHeight: 13,
  },
  createButton: {
    width: 100,
    minHeight: 36,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  filterBlock: {
    gap: 4,
  },
  filterLabel: {
    fontSize: 11,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  feedbackCard: {
    gap: 3,
  },
  feedbackRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  feedbackTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  feedbackBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  list: {
    gap: 5,
  },
  couponCard: {
    gap: 4,
  },
  couponTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 4,
  },
  couponTextWrap: {
    flex: 1,
  },
  couponCode: {
    fontSize: 14,
    marginBottom: 1,
  },
  couponSubtitle: {
    fontSize: 10,
    lineHeight: 14,
  },
  couponUsageLine: {
    fontSize: 10,
    lineHeight: 14,
  },
  couponWindow: {
    fontSize: 9,
    lineHeight: 13,
  },
  couponActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  actionPill: {
    flexGrow: 1,
    flexBasis: "31%",
    minHeight: 30,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 3,
  },
  actionPillLabel: {
    fontSize: 9,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "90%",
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
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 3,
  },
  modalSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  modalCloseButton: {
    padding: 8,
    marginTop: -2,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
  },
  modalNoteCard: {
    gap: 6,
  },
  modalNoteTitle: {
    fontSize: 14,
  },
  modalNoteBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingVertical: 5,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  toggleHint: {
    fontSize: 11,
    lineHeight: 16,
  },
  inlineErrorCard: {
    backgroundColor: "#fef3f2",
  },
  inlineErrorText: {
    fontSize: 12,
    lineHeight: 18,
  },
  dateFieldWrap: {
    gap: 4,
  },
  dateFieldLabel: {
    fontSize: 13,
  },
  dateFieldButton: {
    minHeight: 60,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
  },
  dateFieldValue: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  dateFieldActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateFieldActionButton: {
    padding: 2,
  },
  dateFieldError: {
    fontSize: 12,
    lineHeight: 18,
  },
  dateFieldHelper: {
    fontSize: 11,
    lineHeight: 16,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  datePickerSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: 14,
    overflow: "hidden",
    maxHeight: "88%",
  },
  datePickerTopBar: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  datePickerTopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  datePickerCloseButton: {
    backgroundColor: "transparent",
  },
  datePickerTitle: {
    flex: 1,
    fontSize: 16,
    textAlign: "center",
  },
  datePickerBody: {
    paddingHorizontal: 16,
    gap: 10,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  calendarNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarMonthLabel: {
    flex: 1,
    fontSize: 16,
    textAlign: "center",
  },
  calendarWeekdays: {
    flexDirection: "row",
  },
  calendarWeekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 14,
  },
  calendarGrid: {
    gap: 4,
  },
  calendarWeekRow: {
    flexDirection: "row",
    gap: 4,
  },
  calendarEmptyCell: {
    flex: 1,
    height: 40,
    opacity: 0,
  },
  calendarDayCell: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  calendarDayLabel: {
    fontSize: 13,
    lineHeight: 16,
  },
  calendarDayMarker: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  datePickerFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  datePickerFooterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  datePickerClearButton: {
    minHeight: 36,
    justifyContent: "center",
    paddingRight: 4,
  },
  datePickerFooterButton: {
    minHeight: 36,
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerFooterGhostButton: {
    backgroundColor: "transparent",
  },
  datePickerFooterPrimaryButton: {
    backgroundColor: "#0f766e",
  },
  datePickerFooterDisabledButton: {
    opacity: 0.45,
  },
  datePickerFooterSpacer: {
    width: 1,
  },
  detailHero: {
    gap: 4,
  },
  detailSection: {
    gap: 6,
  },
  detailSectionTitle: {
    fontSize: 13,
  },
  detailSectionBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  redemptionList: {
    gap: 8,
  },
  redemptionCard: {
    gap: 6,
  },
  redemptionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  redemptionText: {
    flex: 1,
  },
  redemptionName: {
    fontSize: 13,
  },
  redemptionMeta: {
    fontSize: 10,
    marginTop: 1,
  },
  redemptionAmount: {
    fontSize: 13,
  },
  redemptionPairs: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  metaPill: {
    minWidth: "48%",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  metaPillLabel: {
    fontSize: 8,
    lineHeight: 12,
  },
  metaPillValue: {
    fontSize: 10,
    lineHeight: 14,
  },
  redemptionFooter: {
    fontSize: 10,
    lineHeight: 14,
  },
});
