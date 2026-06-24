"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  History,
  Pencil,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import {
  AdminSummaryCard,
  AdminSummaryCardsRow,
} from "@/components/shared/admin/AdminOperationalListShell";
import { FormModal } from "@/components/ui/modal";
import { SurfaceCard, SurfaceHeader } from "@/components/shared/SurfaceShell";
import {
  useAdminPaymentGatewayControlList,
  useAdminPaymentGatewayControlHistory,
  useRequestAdminPaymentGatewayControlStepUp,
  useRollbackAdminPaymentGatewayControl,
  useUpdateAdminPaymentGatewayControl,
  useValidateAdminPaymentGatewayControl,
} from "../hooks/use-admin-payment-gateway-control";
import type {
  PaymentGatewayControlHistoryItem,
  PaymentGatewayControlProvider,
  PaymentRoutingDraft,
  PaymentRoutingRuntimeSnapshot,
  PaymobCheckoutFlow,
  PaymobGatewayControlMethodEntry,
  PaymobGatewayControlRuntimeSnapshot,
  StripeGatewayControlRuntimeSnapshot,
} from "../types/admin-payment-gateway-control.types";

const PROVIDERS: PaymentGatewayControlProvider[] = ["PAYMOB", "STRIPE"];
const DEFAULT_PLACEHOLDER = "—";

type ProviderDraft = PaymobGatewayControlRuntimeSnapshot | StripeGatewayControlRuntimeSnapshot;
type ValidationPreview = {
  valid: boolean;
  issues: string[];
  warnings: string[];
};

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function splitList(value: string) {
  return value
    .split(/[\n,]/g)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function joinList(values: string[]) {
  return values.join(", ");
}

function clonePaymobDraft(snapshot: PaymobGatewayControlRuntimeSnapshot): PaymobGatewayControlRuntimeSnapshot {
  return {
    ...snapshot,
    methodRegistry: snapshot.methodRegistry.map((entry) => ({
      ...entry,
      supportedCheckoutFlows: [...entry.supportedCheckoutFlows],
      countryIsoCodes: [...entry.countryIsoCodes],
    })),
    allowedCountryIsoCodes: [...snapshot.allowedCountryIsoCodes],
  };
}

function cloneStripeDraft(snapshot: StripeGatewayControlRuntimeSnapshot): StripeGatewayControlRuntimeSnapshot {
  return {
    ...snapshot,
    allowedCountryIsoCodes: [...snapshot.allowedCountryIsoCodes],
  };
}

function cloneRoutingDraft(snapshot: PaymentRoutingRuntimeSnapshot): PaymentRoutingDraft {
  return {
    defaultProvider: snapshot.defaultProvider,
    priorityOrder: [...snapshot.priorityOrder],
    fallbackProvider: snapshot.fallbackProvider,
  };
}

function providerLabel(provider: PaymentGatewayControlProvider) {
  return provider === "PAYMOB" ? "Paymob" : "Stripe";
}

function providerIcon(provider: PaymentGatewayControlProvider) {
  return provider === "PAYMOB" ? <WalletCards className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />;
}

function methodSummary(snapshot: PaymobGatewayControlRuntimeSnapshot, t: ReturnType<typeof useTranslations>) {
  const active = snapshot.methodRegistry.filter((method) => method.enabled).length;
  return t("providers.methodSummary", { count: active, flow: snapshot.checkoutFlow });
}

function routingSummary(snapshot: PaymentRoutingRuntimeSnapshot, t: ReturnType<typeof useTranslations>) {
  const priority = snapshot.priorityOrder.length > 0 ? joinList(snapshot.priorityOrder) : DEFAULT_PLACEHOLDER;
  return t("providers.routingSummary", {
    defaultProvider: snapshot.defaultProvider ?? DEFAULT_PLACEHOLDER,
    priority,
  });
}

function getProviderChangeLabels(original: ProviderDraft, draft: ProviderDraft) {
  const changed: string[] = [];
  if (original.enabled !== draft.enabled) changed.push("enabled");
  if (original.maintenanceMode !== draft.maintenanceMode) changed.push("maintenance");
  if (joinList(original.allowedCountryIsoCodes) !== joinList(draft.allowedCountryIsoCodes)) {
    changed.push("countries");
  }
  if ("checkoutFlow" in original && "checkoutFlow" in draft && original.checkoutFlow !== draft.checkoutFlow) {
    changed.push("checkoutFlow");
  }
  if ("defaultMethod" in original && "defaultMethod" in draft && original.defaultMethod !== draft.defaultMethod) {
    changed.push("defaultMethod");
  }
  if (
    "methodRegistry" in original &&
    "methodRegistry" in draft &&
    JSON.stringify(original.methodRegistry) !== JSON.stringify(draft.methodRegistry)
  ) {
    changed.push("methods");
  }
  return changed;
}

function getRoutingChangeLabels(original: PaymentRoutingRuntimeSnapshot, draft: PaymentRoutingDraft) {
  const changed: string[] = [];
  if (original.defaultProvider !== draft.defaultProvider) changed.push("defaultProvider");
  if (original.fallbackProvider !== draft.fallbackProvider) changed.push("fallbackProvider");
  if (joinList(original.priorityOrder) !== joinList(draft.priorityOrder)) changed.push("priorityOrder");
  return changed;
}

function MethodEditorRow({
  method,
  onChange,
}: {
  method: PaymobGatewayControlMethodEntry;
  onChange: (next: PaymobGatewayControlMethodEntry) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("payment-gateway-control");

  return (
    <div className="rounded-[22px] border border-border-light bg-white/80 p-4 dark:border-white/8 dark:bg-white/[0.03]">
      <div className="grid gap-3 lg:grid-cols-12">
        <label className="lg:col-span-2">
          <span className="mb-1 block text-xs font-medium text-text-muted">{t("methodEditor.key")}</span>
          <input
            value={method.key}
            disabled
            className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-secondary dark:border-white/10 dark:bg-surface-secondary"
          />
        </label>
        <label className="lg:col-span-3">
          <span className="mb-1 block text-xs font-medium text-text-muted">{t("methodEditor.label")}</span>
          <input
            value={method.label}
            onChange={(event) => onChange({ ...method, label: event.target.value })}
            className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-secondary"
          />
        </label>
        <label className="lg:col-span-2">
          <span className="mb-1 block text-xs font-medium text-text-muted">{t("methodEditor.type")}</span>
          <input
            value={method.type}
            onChange={(event) => onChange({ ...method, type: event.target.value.toUpperCase() })}
            className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-secondary"
          />
        </label>
        <label className="lg:col-span-2">
          <span className="mb-1 block text-xs font-medium text-text-muted">{t("methodEditor.priority")}</span>
          <input
            type="number"
            value={method.priority}
            onChange={(event) =>
              onChange({
                ...method,
                priority: Number.isFinite(Number(event.target.value)) ? Number(event.target.value) : 0,
              })
            }
            className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-secondary"
            />
        </label>
        <label className="flex items-center gap-2 lg:col-span-3 lg:pt-7">
          <input
            type="checkbox"
            checked={method.enabled}
            onChange={(event) => onChange({ ...method, enabled: event.target.checked })}
            className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
          />
          <span className="text-sm text-text-primary">{t("methodEditor.enabled")}</span>
        </label>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label>
          <span className="mb-1 block text-xs font-medium text-text-muted">{t("methodEditor.supportedCheckoutFlows")}</span>
          <div className="flex flex-wrap gap-3 rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 dark:border-white/10 dark:bg-surface-secondary">
            {(["legacy", "intention"] as PaymobCheckoutFlow[]).map((flow) => (
              <label key={flow} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={method.supportedCheckoutFlows.includes(flow)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? Array.from(new Set([...method.supportedCheckoutFlows, flow]))
                      : method.supportedCheckoutFlows.filter((item) => item !== flow);
                    onChange({ ...method, supportedCheckoutFlows: next });
                  }}
                />
                <span className="capitalize">{flow === "legacy" ? t("methodEditor.flowLegacy") : t("methodEditor.flowIntention")}</span>
              </label>
            ))}
          </div>
        </label>

        <label>
          <span className="mb-1 block text-xs font-medium text-text-muted">{t("methodEditor.countryIsoCodes")}</span>
          <input
            value={joinList(method.countryIsoCodes)}
            onChange={(event) => onChange({ ...method, countryIsoCodes: splitList(event.target.value) })}
            placeholder="EG, AE"
            className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-secondary"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-text-muted">{t("methodEditor.integrationReference")}</span>
        <input
          value={method.integrationId ?? ""}
          onChange={(event) => onChange({ ...method, integrationId: event.target.value.trim() || null })}
          className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm dark:border-white/10 dark:bg-surface-secondary"
          placeholder={t("methodEditor.integrationPlaceholder")}
        />
      </label>
    </div>
  );
}

function ValidationNotice({
  title,
  result,
}: {
  title: string;
  result: ValidationPreview | null;
}) {
  if (!result) return null;

  return (
    <div className="rounded-[20px] border border-border-light bg-surface-secondary/80 p-4 dark:border-white/8 dark:bg-white/[0.03]">
      <div className="flex items-start gap-3">
        {result.valid ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          {result.issues.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-600 dark:text-rose-400">
              {result.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
          {result.warnings.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-300">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProviderEditModal({
  snapshot,
  isOpen,
  onClose,
}: {
  snapshot: ProviderDraft | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("payment-gateway-control");
  const provider = snapshot?.provider ?? null;
  const validateMutation = useValidateAdminPaymentGatewayControl("provider", provider);
  const stepUpMutation = useRequestAdminPaymentGatewayControlStepUp("provider", provider);
  const updateMutation = useUpdateAdminPaymentGatewayControl("provider", provider);

  const [draft, setDraft] = useState<ProviderDraft | null>(null);
  const [reason, setReason] = useState("");
  const [stepUpChallengeId, setStepUpChallengeId] = useState("");
  const [stepUpCode, setStepUpCode] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [validationPreview, setValidationPreview] = useState<ValidationPreview | null>(null);

  useEffect(() => {
    if (!isOpen || !snapshot) return;
    queueMicrotask(() => {
      setDraft(snapshot.provider === "PAYMOB" ? clonePaymobDraft(snapshot) : cloneStripeDraft(snapshot));
      setReason("");
      setStepUpChallengeId("");
      setStepUpCode("");
      setFeedback(null);
      setValidationPreview(null);
    });
  }, [isOpen, snapshot]);

  if (!provider || !draft) return null;

  const changedFields = getProviderChangeLabels(snapshot ?? draft, draft);
  const canSave = Boolean(
    changedFields.length > 0 && reason.trim() && stepUpChallengeId.trim() && stepUpCode.trim(),
  );

  const handleValidate = async () => {
    const result = (await validateMutation.mutateAsync(draft)) as ValidationPreview;
    setValidationPreview({
      valid: result.valid,
      issues: result.issues,
      warnings: result.warnings,
    });
  };

  const handleRequestStepUp = async () => {
    try {
      const result = await stepUpMutation.mutateAsync();
      setStepUpChallengeId(result.challengeId);
      setFeedback({ kind: "success", message: t("providerModal.verificationCodeSent", { target: result.maskedTarget }) });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : t("providerModal.unableRequestStepUp"),
      });
    }
  };

  const handleSave = async () => {
    try {
      if (provider === "PAYMOB") {
        await updateMutation.mutateAsync({
          ...(draft as PaymobGatewayControlRuntimeSnapshot),
          reason: reason.trim(),
          stepUpChallengeId: stepUpChallengeId.trim(),
          stepUpCode: stepUpCode.trim(),
        });
      } else {
        await updateMutation.mutateAsync({
          ...(draft as StripeGatewayControlRuntimeSnapshot),
          reason: reason.trim(),
          stepUpChallengeId: stepUpChallengeId.trim(),
          stepUpCode: stepUpCode.trim(),
        });
      }
      onClose();
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : t("providerModal.unableSaveProviderConfiguration"),
      });
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("providerModal.title", { provider: providerLabel(provider) })}
      description={t("providerModal.description")}
      eyebrow={t("providerModal.eyebrow")}
      submitLabel={t("actions.saveChanges")}
      submitDisabled={!canSave || updateMutation.isPending}
      loading={updateMutation.isPending}
      onSubmit={handleSave}
      size="2xl"
    >
      <div className="space-y-4">
        {feedback ? (
          <StateCard
            centered={false}
            icon={
              feedback.kind === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              )
            }
            title={feedback.kind === "success" ? t("actions.actionCompleted") : t("actions.actionFailed")}
            note={feedback.message}
          />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-medium text-text-primary">{t("providerModal.providerEnabled")}</span>
            <select
              value={String(draft.enabled)}
              onChange={(event) => setDraft({ ...draft, enabled: event.target.value === "true" } as ProviderDraft)}
              className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm"
            >
              <option value="true">{t("states.enabled")}</option>
              <option value="false">{t("states.disabled")}</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-text-primary">{t("providerModal.maintenanceMode")}</span>
            <select
              value={String(draft.maintenanceMode)}
              onChange={(event) =>
                setDraft({ ...draft, maintenanceMode: event.target.value === "true" } as ProviderDraft)
              }
              className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm"
            >
              <option value="false">{t("states.disabled")}</option>
              <option value="true">{t("states.enabled")}</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-text-primary">{t("providerModal.allowedCountries")}</span>
            <input
              value={joinList(draft.allowedCountryIsoCodes)}
              onChange={(event) =>
                setDraft({ ...draft, allowedCountryIsoCodes: splitList(event.target.value) } as ProviderDraft)
              }
              placeholder="EG, AE"
              className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm"
            />
          </label>
        </div>

        {provider === "PAYMOB" ? (
          <div className="rounded-[26px] border border-border-light bg-surface-secondary/50 p-4 dark:border-white/8 dark:bg-white/[0.03]">
            <div className="grid gap-4 lg:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-primary">{t("providerModal.checkoutFlow")}</span>
                <select
                  value={(draft as PaymobGatewayControlRuntimeSnapshot).checkoutFlow}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      checkoutFlow: event.target.value as PaymobCheckoutFlow,
                    } as ProviderDraft)
                  }
                  className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm"
                >
                  <option value="legacy">{t("providerModal.checkoutFlowLegacy")}</option>
                  <option value="intention">{t("providerModal.checkoutFlowIntention")}</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-text-primary">{t("providerModal.defaultMethod")}</span>
                <select
                  value={(draft as PaymobGatewayControlRuntimeSnapshot).defaultMethod ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      defaultMethod: event.target.value.trim() || null,
                    } as ProviderDraft)
                  }
                  className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm"
                >
                  <option value="">{DEFAULT_PLACEHOLDER}</option>
                  {(draft as PaymobGatewayControlRuntimeSnapshot).methodRegistry.map((method) => (
                    <option key={method.key} value={method.key}>
                      {method.key}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-secondary dark:border-white/8 dark:bg-surface-secondary">
                <p className="font-medium text-text-primary">{t("providerModal.paymobSummary")}</p>
                <p className="mt-1">{methodSummary(draft as PaymobGatewayControlRuntimeSnapshot, t)}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-text-primary">{t("providers.methodRegistryTitle")}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{t("providers.methodRegistryDescription")}</p>
                </div>
                <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-text-brand">
                  {t("providerModal.methodRegistryActive", {
                    value: (draft as PaymobGatewayControlRuntimeSnapshot).methodRegistry.filter((method) => method.enabled).length,
                  })}
                </span>
              </div>

              {(draft as PaymobGatewayControlRuntimeSnapshot).methodRegistry.map((method, index) => (
                <MethodEditorRow
                  key={`${method.key}-${index}`}
                  method={method}
                  onChange={(next) =>
                    setDraft({
                      ...draft,
                      methodRegistry: (draft as PaymobGatewayControlRuntimeSnapshot).methodRegistry.map((item, currentIndex) =>
                        currentIndex === index ? next : item,
                      ),
                    } as ProviderDraft)
                  }
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[26px] border border-border-light bg-surface-secondary/50 p-4 dark:border-white/8 dark:bg-white/[0.03]">
            <p className="text-sm text-text-secondary">{t("providers.stripeDescription")}</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2 lg:col-span-1">
            <span className="text-sm font-medium text-text-primary">{t("providerModal.changeReason")}</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              placeholder={t("providerModal.changeReasonPlaceholder")}
              className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-3 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-text-primary">{t("providerModal.stepUpChallengeId")}</span>
            <input
              value={stepUpChallengeId}
              onChange={(event) => setStepUpChallengeId(event.target.value)}
              placeholder={t("providerModal.stepUpChallengePlaceholder")}
              className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-text-primary">{t("providerModal.stepUpCode")}</span>
            <input
              value={stepUpCode}
              onChange={(event) => setStepUpCode(event.target.value)}
              placeholder={t("providerModal.stepUpCodePlaceholder")}
              className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleRequestStepUp} disabled={stepUpMutation.isPending}>
            <ShieldAlert className="h-4 w-4" />
            {t("actions.requestStepUp")}
          </Button>
          <Button type="button" variant="outline" onClick={handleValidate} disabled={validateMutation.isPending}>
            <ShieldCheck className="h-4 w-4" />
            {t("actions.validate")}
          </Button>
          <p className="self-center text-xs leading-5 text-text-muted">
            {t("providerModal.superAdminNote")}
          </p>
        </div>

        <ValidationNotice
          title={provider === "PAYMOB" ? t("providerModal.validationPaymob") : t("providerModal.validationStripe")}
          result={validationPreview}
        />

        {changedFields.length > 0 ? (
          <div className="rounded-[20px] border border-dashed border-primary/30 bg-primary-light/30 p-4">
            <p className="text-sm font-semibold text-text-brand">{t("providerModal.pendingChanges")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {changedFields.map((field) => (
                <span key={field} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-text-brand">
                  {t(`changeLabels.${field}` as never)}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </FormModal>
  );
}

function RoutingEditModal({
  snapshot,
  isOpen,
  onClose,
}: {
  snapshot: PaymentRoutingRuntimeSnapshot | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("payment-gateway-control");
  const validateMutation = useValidateAdminPaymentGatewayControl("routing", null);
  const stepUpMutation = useRequestAdminPaymentGatewayControlStepUp("routing", null);
  const updateMutation = useUpdateAdminPaymentGatewayControl("routing", null);

  const [draft, setDraft] = useState<PaymentRoutingDraft | null>(null);
  const [reason, setReason] = useState("");
  const [stepUpChallengeId, setStepUpChallengeId] = useState("");
  const [stepUpCode, setStepUpCode] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [validationPreview, setValidationPreview] = useState<ValidationPreview | null>(null);

  useEffect(() => {
    if (!isOpen || !snapshot) return;
    queueMicrotask(() => {
      setDraft(cloneRoutingDraft(snapshot));
      setReason("");
      setStepUpChallengeId("");
      setStepUpCode("");
      setFeedback(null);
      setValidationPreview(null);
    });
  }, [isOpen, snapshot]);

  if (!snapshot || !draft) return null;

  const changedFields = getRoutingChangeLabels(snapshot, draft);
  const canSave = Boolean(changedFields.length > 0 && reason.trim() && stepUpChallengeId.trim() && stepUpCode.trim());

  const handleValidate = async () => {
    const result = (await validateMutation.mutateAsync(draft)) as ValidationPreview;
    setValidationPreview({
      valid: result.valid,
      issues: result.issues,
      warnings: result.warnings,
    });
  };

  const handleRequestStepUp = async () => {
    try {
      const result = await stepUpMutation.mutateAsync();
      setStepUpChallengeId(result.challengeId);
      setFeedback({ kind: "success", message: t("routingModal.verificationCodeSent", { target: result.maskedTarget }) });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : t("routingModal.unableRequestStepUp"),
      });
    }
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        ...draft,
        reason: reason.trim(),
        stepUpChallengeId: stepUpChallengeId.trim(),
        stepUpCode: stepUpCode.trim(),
      });
      onClose();
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : t("routingModal.unableSaveRoutingConfiguration"),
      });
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("routingModal.title")}
      description={t("routingModal.description")}
      eyebrow={t("routingModal.eyebrow")}
      submitLabel={t("actions.saveChanges")}
      submitDisabled={!canSave || updateMutation.isPending}
      loading={updateMutation.isPending}
      onSubmit={handleSave}
      size="xl"
    >
      <div className="space-y-4">
        {feedback ? (
          <StateCard
            centered={false}
            icon={
              feedback.kind === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              )
            }
            title={feedback.kind === "success" ? t("actions.actionCompleted") : t("actions.actionFailed")}
            note={feedback.message}
          />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-medium text-text-primary">{t("routingModal.defaultProvider")}</span>
            <select
              value={draft.defaultProvider ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  defaultProvider: (event.target.value || null) as PaymentGatewayControlProvider | null,
                })
              }
              className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm"
            >
              <option value="">{t("common.none")}</option>
              {PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {providerLabel(provider)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-text-primary">{t("routingModal.fallbackProvider")}</span>
            <select
              value={draft.fallbackProvider ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  fallbackProvider: (event.target.value || null) as PaymentGatewayControlProvider | null,
                })
              }
              className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm"
            >
              <option value="">{t("common.none")}</option>
              {PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {providerLabel(provider)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-text-primary">{t("routingModal.priorityOrder")}</span>
            <input
              value={joinList(draft.priorityOrder)}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  priorityOrder: splitList(event.target.value) as PaymentGatewayControlProvider[],
                })
              }
              placeholder="PAYMOB, STRIPE"
              className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2 lg:col-span-1">
            <span className="text-sm font-medium text-text-primary">{t("routingModal.changeReason")}</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              placeholder={t("routingModal.changeReasonPlaceholder")}
              className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-3 text-sm"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-text-primary">{t("routingModal.stepUpChallengeId")}</span>
            <input
              value={stepUpChallengeId}
              onChange={(event) => setStepUpChallengeId(event.target.value)}
              placeholder={t("routingModal.stepUpChallengePlaceholder")}
              className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-text-primary">{t("routingModal.stepUpCode")}</span>
            <input
              value={stepUpCode}
              onChange={(event) => setStepUpCode(event.target.value)}
              placeholder={t("routingModal.stepUpCodePlaceholder")}
              className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleRequestStepUp} disabled={stepUpMutation.isPending}>
            <ShieldAlert className="h-4 w-4" />
            {t("actions.requestStepUp")}
          </Button>
          <Button type="button" variant="outline" onClick={handleValidate} disabled={validateMutation.isPending}>
            <ShieldCheck className="h-4 w-4" />
            {t("actions.validate")}
          </Button>
          <p className="self-center text-xs leading-5 text-text-muted">
            {t("routingModal.superAdminNote")}
          </p>
        </div>

        <ValidationNotice title={t("routingModal.routingValidation")} result={validationPreview} />

        {changedFields.length > 0 ? (
          <div className="rounded-[20px] border border-dashed border-primary/30 bg-primary-light/30 p-4">
            <p className="text-sm font-semibold text-text-brand">{t("routingModal.pendingChanges")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {changedFields.map((field) => (
                <span key={field} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-text-brand">
                  {t(`changeLabels.${field}` as never)}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </FormModal>
  );
}

function RollbackModal({
  item,
  isOpen,
  onClose,
}: {
  item: PaymentGatewayControlHistoryItem | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("payment-gateway-control");
  const scope = item?.scope ?? "provider";
  const provider = item?.provider ?? null;
  const rollbackMutation = useRollbackAdminPaymentGatewayControl(scope, provider);
  const stepUpMutation = useRequestAdminPaymentGatewayControlStepUp(scope, provider);

  const [reason, setReason] = useState("");
  const [stepUpChallengeId, setStepUpChallengeId] = useState("");
  const [stepUpCode, setStepUpCode] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    queueMicrotask(() => {
      setReason("");
      setStepUpChallengeId("");
      setStepUpCode("");
      setFeedback(null);
    });
  }, [isOpen]);

  if (!item) return null;

  const canSave = Boolean(reason.trim() && stepUpChallengeId.trim() && stepUpCode.trim());

  const handleRequestStepUp = async () => {
    try {
      const result = await stepUpMutation.mutateAsync();
      setStepUpChallengeId(result.challengeId);
      setFeedback({ kind: "success", message: t("rollbackModal.verificationCodeSent", { target: result.maskedTarget }) });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : t("rollbackModal.unableRequestStepUp"),
      });
    }
  };

  const handleRollback = async () => {
    try {
      await rollbackMutation.mutateAsync({
        reason: reason.trim(),
        revisionId: item.id,
        stepUpChallengeId: stepUpChallengeId.trim(),
        stepUpCode: stepUpCode.trim(),
      });
      onClose();
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : t("rollbackModal.unableRollbackConfiguration"),
      });
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("rollbackModal.title")}
      description={t("rollbackModal.description")}
      eyebrow={t("rollbackModal.eyebrow")}
      submitLabel={t("actions.rollback")}
      destructive
      submitDisabled={!canSave || rollbackMutation.isPending}
      loading={rollbackMutation.isPending}
      onSubmit={handleRollback}
      size="lg"
    >
      <div className="space-y-4">
        {feedback ? (
          <StateCard
            centered={false}
            icon={
              feedback.kind === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              )
            }
            title={feedback.kind === "success" ? t("actions.actionCompleted") : t("actions.actionFailed")}
            note={feedback.message}
          />
        ) : null}

        <div className="rounded-[20px] border border-border-light bg-surface-secondary/60 p-4 dark:border-white/8 dark:bg-white/[0.03]">
          <div className="grid gap-2 text-sm text-text-secondary">
            <p>
              {t("rollbackModal.provider")}:{" "}
              <span className="font-semibold text-text-primary">{item.provider ?? t("common.routing")}</span>
            </p>
            <p>
              {t("rollbackModal.action")}: <span className="font-semibold text-text-primary">{item.action}</span>
            </p>
            <p>
              {t("rollbackModal.changedAt")}:{" "}
              <span className="font-semibold text-text-primary">{formatDateTime(item.changedAt, locale)}</span>
            </p>
          </div>
        </div>

        <label className="space-y-2 block">
          <span className="text-sm font-medium text-text-primary">{t("rollbackModal.rollbackReason")}</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            placeholder={t("rollbackModal.rollbackReasonPlaceholder")}
            className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-3 text-sm"
          />
        </label>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-text-primary">{t("rollbackModal.stepUpChallengeId")}</span>
            <input
              value={stepUpChallengeId}
              onChange={(event) => setStepUpChallengeId(event.target.value)}
              placeholder={t("rollbackModal.stepUpChallengePlaceholder")}
              className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-text-primary">{t("rollbackModal.stepUpCode")}</span>
            <input
              value={stepUpCode}
              onChange={(event) => setStepUpCode(event.target.value)}
              placeholder={t("rollbackModal.stepUpCodePlaceholder")}
              className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleRequestStepUp} disabled={stepUpMutation.isPending}>
            <ShieldAlert className="h-4 w-4" />
            {t("rollbackModal.requestStepUp")}
          </Button>
          <p className="self-center text-xs leading-5 text-text-muted">
            {t("rollbackModal.note")}
          </p>
        </div>
      </div>
    </FormModal>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
}) {
  const className =
    tone === "success"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200"
      : tone === "warning"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/12 dark:text-amber-200"
        : tone === "danger"
          ? "bg-rose-100 text-rose-700 dark:bg-rose-500/12 dark:text-rose-200"
          : tone === "primary"
            ? "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light"
            : "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/70";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

export default function AdminPaymentGatewayControlScreen() {
  const locale = useLocale();
  const t = useTranslations("payment-gateway-control");
  const listQuery = useAdminPaymentGatewayControlList();
  const paymobHistoryQuery = useAdminPaymentGatewayControlHistory("provider", "PAYMOB");
  const stripeHistoryQuery = useAdminPaymentGatewayControlHistory("provider", "STRIPE");
  const routingHistoryQuery = useAdminPaymentGatewayControlHistory("routing", null);

  const [providerModal, setProviderModal] = useState<PaymentGatewayControlProvider | null>(null);
  const [routingModalOpen, setRoutingModalOpen] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<PaymentGatewayControlHistoryItem | null>(null);

  const providers = listQuery.data?.items ?? [];
  const routing = listQuery.data?.routing ?? null;

  const paymobSnapshot = providers.find((item) => item.provider === "PAYMOB") as PaymobGatewayControlRuntimeSnapshot | undefined;
  const stripeSnapshot = providers.find((item) => item.provider === "STRIPE") as StripeGatewayControlRuntimeSnapshot | undefined;

  const paymobHistory = paymobHistoryQuery.data?.items ?? [];
  const stripeHistory = stripeHistoryQuery.data?.items ?? [];
  const routingHistory = routingHistoryQuery.data?.items ?? [];

  const mergedHistory = useMemo(
    () =>
      [...paymobHistory, ...stripeHistory, ...routingHistory].sort(
        (left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime(),
      ),
    [paymobHistory, routingHistory, stripeHistory],
  );

  const latestProviderChange = useCallback(
    (provider: PaymentGatewayControlProvider) =>
      mergedHistory.find(
        (item) =>
          item.provider === provider ||
          (provider === "PAYMOB" && item.provider === "PAYMOB") ||
          (provider === "STRIPE" && item.provider === "STRIPE"),
      ) ?? null,
    [mergedHistory],
  );

  const providerColumns = useMemo<ColumnDef<ProviderDraft>[]>(() => [
    {
      id: "provider",
      header: t("table.provider"),
      accessor: (row) => row.provider,
      cell: (row) => (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-light text-text-brand">
            {providerIcon(row.provider)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">{providerLabel(row.provider)}</p>
            <p className="mt-1 text-xs text-text-secondary">
              {row.provider === "PAYMOB"
                ? methodSummary(row as PaymobGatewayControlRuntimeSnapshot, t)
                : t("providers.stripeDescription")}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "enabled",
      header: t("table.state"),
      accessor: (row) => row.enabled,
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={row.enabled ? "success" : "danger"}>{row.enabled ? t("states.enabled") : t("states.disabled")}</Badge>
          <Badge tone={row.maintenanceMode ? "warning" : "neutral"}>{row.maintenanceMode ? t("states.maintenance") : t("states.live")}</Badge>
        </div>
      ),
    },
    {
      id: "validation",
      header: t("table.validation"),
      accessor: (row) => row.validation.healthy,
      cell: (row) => (
        <div className="space-y-1">
          <Badge tone={row.validation.healthy ? "success" : "danger"}>
            {row.validation.healthy ? t("states.healthy") : t("states.issues")}
          </Badge>
          {row.validation.issues.length > 0 ? (
            <p className="text-xs text-text-muted">{row.validation.issues[0]}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "countries",
      header: t("table.countries"),
      accessor: (row) => row.allowedCountryIsoCodes.length,
      cell: (row) => (
        <span className="text-sm text-text-secondary">
          {row.allowedCountryIsoCodes.length > 0 ? joinList(row.allowedCountryIsoCodes) : t("common.none")}
        </span>
      ),
    },
    {
      id: "updatedAt",
      header: t("table.lastUpdated"),
      sortable: true,
      accessor: (row) => (row.updatedAt ? new Date(row.updatedAt).getTime() : 0),
      cell: (row) => (
        <div className="space-y-1">
          <p className="text-sm text-text-secondary">{formatDateTime(row.updatedAt, locale)}</p>
          <p className="text-xs text-text-muted">
            {latestProviderChange(row.provider)?.action ?? t("states.noChangesYet")}
          </p>
        </div>
      ),
    },
  ], [latestProviderChange, locale, t]);

  const routingColumns = useMemo<ColumnDef<PaymentRoutingRuntimeSnapshot>[]>(() => [
    {
      id: "defaultProvider",
      header: t("table.defaultProvider"),
      accessor: (row) => row.defaultProvider ?? DEFAULT_PLACEHOLDER,
      cell: (row) => <Badge tone="primary">{row.defaultProvider ?? t("common.none")}</Badge>,
    },
    {
      id: "priorityOrder",
      header: t("table.priorityOrder"),
      accessor: (row) => joinList(row.priorityOrder),
      cell: (row) => <span className="text-sm text-text-secondary">{joinList(row.priorityOrder)}</span>,
    },
    {
      id: "fallbackProvider",
      header: t("table.fallback"),
      accessor: (row) => row.fallbackProvider ?? DEFAULT_PLACEHOLDER,
      cell: (row) => <Badge tone="warning">{row.fallbackProvider ?? t("common.none")}</Badge>,
    },
    {
      id: "validation",
      header: t("table.validation"),
      accessor: (row) => row.validation.healthy,
      cell: (row) => (
        <div className="space-y-1">
          <Badge tone={row.validation.healthy ? "success" : "danger"}>
            {row.validation.healthy ? t("states.healthy") : t("states.issues")}
          </Badge>
          {row.validation.issues.length > 0 ? (
            <p className="text-xs text-text-muted">{row.validation.issues[0]}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "updatedAt",
      header: t("table.lastUpdated"),
      sortable: true,
      accessor: (row) => (row.updatedAt ? new Date(row.updatedAt).getTime() : 0),
      cell: (row) => <span className="text-sm text-text-secondary">{formatDateTime(row.updatedAt, locale)}</span>,
    },
  ], [locale, t]);

  const historyColumns = useMemo<ColumnDef<PaymentGatewayControlHistoryItem>[]>(() => [
    {
      id: "changedAt",
      header: t("table.changedAt"),
      sortable: true,
      accessor: (row) => new Date(row.changedAt).getTime(),
      cell: (row) => (
        <div className="space-y-1">
          <p className="text-sm text-text-primary">{formatDateTime(row.changedAt, locale)}</p>
          <p className="text-xs text-text-muted">{row.requestId ?? "-"}</p>
        </div>
      ),
    },
    {
      id: "scope",
      header: t("table.scope"),
      accessor: (row) => row.scope,
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary">{row.scope.toUpperCase()}</Badge>
          <Badge tone={row.provider ? "neutral" : "warning"}>{row.provider ?? t("common.routing")}</Badge>
        </div>
      ),
    },
    {
      id: "action",
      header: t("table.action"),
      accessor: (row) => row.action,
      cell: (row) => <Badge tone={row.action === "ROLLBACK" ? "warning" : "neutral"}>{row.action}</Badge>,
    },
    {
      id: "reason",
      header: t("table.reason"),
      accessor: (row) => row.reason ?? "",
      cell: (row) => (
        <div className="max-w-[26rem]">
          <p className="truncate text-sm text-text-secondary">{row.reason ?? t("states.noReasonProvided")}</p>
          {row.validationIssues.length > 0 ? (
            <p className="mt-1 text-xs text-rose-600">{row.validationIssues[0]}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "actor",
      header: t("table.actor"),
      accessor: (row) => row.actorDisplayName ?? row.actorUserId ?? "-",
      cell: (row) => <span className="text-sm text-text-secondary">{row.actorDisplayName ?? row.actorUserId ?? "-"}</span>,
    },
  ], [locale, t]);

  const providerLoading = listQuery.isLoading;
  const routingLoading = listQuery.isLoading;
  const historyLoading = paymobHistoryQuery.isLoading || stripeHistoryQuery.isLoading || routingHistoryQuery.isLoading;

  if (listQuery.isLoading && !listQuery.data) {
    return <ListStateSkeleton items={6} />;
  }

  const activeProviders = providers.filter((item) => item.enabled && !item.maintenanceMode).length;
  const healthyProviders = providers.filter((item) => item.validation.healthy).length;
  const activeRoutingProvider = routing?.defaultProvider ?? routing?.priorityOrder[0] ?? t("common.none");

  return (
    <div className="space-y-6">
      <SurfaceHeader
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={t("page.description")}
      />

      <AdminSummaryCardsRow>
        <AdminSummaryCard
          label={t("summary.activeProviders")}
          value={String(activeProviders)}
          hint={t("summary.activeProvidersHint")}
        />
        <AdminSummaryCard
          label={t("summary.healthyProviders")}
          value={String(healthyProviders)}
          hint={t("summary.healthyProvidersHint")}
        />
        <AdminSummaryCard
          label={t("summary.defaultRoute")}
          value={String(activeRoutingProvider)}
          hint={t("summary.defaultRouteHint")}
        />
      </AdminSummaryCardsRow>

      <SurfaceCard as="section" variant="section">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{t("sections.providers.title")}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t("sections.providers.description")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setProviderModal("PAYMOB")}
            >
              <Pencil className="h-4 w-4" />
              {t("actions.editPaymob")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setProviderModal("STRIPE")}
            >
              <Pencil className="h-4 w-4" />
              {t("actions.editStripe")}
            </Button>
          </div>
        </div>

        <DataTable
          data={providers}
          columns={providerColumns}
          getRowId={(row) => row.provider}
          loading={providerLoading}
          striped
          hoverable
          rowActions={(row) => (
            <Button type="button" size="sm" variant="outline" onClick={() => setProviderModal(row.provider)}>
              <Pencil className="h-4 w-4" />
              {t("actions.configure")}
            </Button>
          )}
          emptyState={{
            title: t("providers.noSnapshotsTitle"),
            description: t("providers.noSnapshotsDescription"),
          }}
        />
      </SurfaceCard>

      {routing ? (
        <SurfaceCard as="section" variant="section">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{t("sections.routing.title")}</h2>
              <p className="mt-1 text-sm text-text-secondary">{t("sections.routing.description")}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRoutingModalOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t("actions.configureRouting")}
            </Button>
          </div>

          <DataTable
            data={[routing]}
            columns={routingColumns}
            getRowId={() => "routing"}
            loading={routingLoading}
            striped
            hoverable
            rowActions={() => (
              <Button type="button" size="sm" variant="outline" onClick={() => setRoutingModalOpen(true)}>
                <Pencil className="h-4 w-4" />
                {t("actions.configure")}
              </Button>
            )}
          />
        </SurfaceCard>
      ) : null}

      <SurfaceCard as="section" variant="section">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{t("sections.history.title")}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t("sections.history.description")}</p>
          </div>
          <Badge tone="primary">
            <History className="h-3.5 w-3.5" />
            {t("table.entries", { value: mergedHistory.length })}
          </Badge>
        </div>

        <DataTable
          data={mergedHistory}
          columns={historyColumns}
          getRowId={(row) => row.id}
          loading={historyLoading}
          striped
          hoverable
          rowActionsHeader={t("table.rollback")}
          rowActions={(row) =>
            row.afterSnapshot ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setRollbackTarget(row)}>
                <RotateCcw className="h-4 w-4" />
                {t("actions.rollback")}
              </Button>
            ) : (
              <span className="text-xs text-text-muted">{t("states.unavailable")}</span>
            )
          }
          emptyState={{
            title: t("common.noHistory"),
            description: t("common.noHistoryDescription"),
          }}
        />
      </SurfaceCard>

      <ProviderEditModal
        snapshot={
          providerModal === "PAYMOB"
            ? paymobSnapshot ?? null
            : providerModal === "STRIPE"
              ? stripeSnapshot ?? null
              : null
        }
        isOpen={providerModal !== null}
        onClose={() => setProviderModal(null)}
      />

      <RoutingEditModal
        snapshot={routing}
        isOpen={routingModalOpen}
        onClose={() => setRoutingModalOpen(false)}
      />

      <RollbackModal
        item={rollbackTarget}
        isOpen={rollbackTarget !== null}
        onClose={() => setRollbackTarget(null)}
      />
    </div>
  );
}
