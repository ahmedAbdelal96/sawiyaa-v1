"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  History,
  Pencil,
  Plus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
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
import AdminForbiddenView from "@/components/admin/AdminForbiddenView";
import { useCurrentUser } from "@/features/users/hooks/use-users";
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
  PaymentRoute,
  PaymentRouteDraft,
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
    currencyRoutes: snapshot.currencyRoutes.map(({ source: _source, ...route }) => ({ ...route })),
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
  if (JSON.stringify(original.currencyRoutes) !== JSON.stringify(draft.currencyRoutes)) changed.push("currencyRoutes");
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

      <div className="mt-4 rounded-2xl border border-primary/20 bg-primary-light/30 px-3 py-2 text-xs leading-5 text-text-secondary">
        {t("methodEditor.integrationManaged")}
      </div>
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [validationPreview, setValidationPreview] = useState<ValidationPreview | null>(null);

  useEffect(() => {
    if (!isOpen || !snapshot) return;
    queueMicrotask(() => {
      setDraft(snapshot.provider === "PAYMOB" ? clonePaymobDraft(snapshot) : cloneStripeDraft(snapshot));
      setReason("");
      setStepUpChallengeId("");
      setStepUpCode("");
      setCurrentPassword("");
      setCurrentPassword("");
      setFeedback(null);
      setValidationPreview(null);
    });
  }, [isOpen, snapshot]);

  if (!provider || !draft) return null;

  const changedFields = getProviderChangeLabels(snapshot ?? draft, draft);
  const canSave = Boolean(
    changedFields.length > 0 && reason.trim() && currentPassword,
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
          currentPassword,
        });
      } else {
        await updateMutation.mutateAsync({
          ...(draft as StripeGatewayControlRuntimeSnapshot),
          reason: reason.trim(),
          stepUpChallengeId: stepUpChallengeId.trim(),
          stepUpCode: stepUpCode.trim(),
          currentPassword,
        });
      }
      onClose();
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : t("providerModal.unableSaveProviderConfiguration"),
      });
    } finally {
      setCurrentPassword("");
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
            <span className="text-sm font-medium text-text-primary">Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm"
            />
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
            <span className="text-sm font-medium text-text-primary">{locale === "ar" ? "كلمة المرور الحالية" : "Current password"}</span>
            <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
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

function RouteEditorRow({
  route,
  catalog,
  onChange,
  onRemove,
}: {
  route: PaymentRouteDraft;
  catalog: PaymentRoutingRuntimeSnapshot["routeCatalog"];
  onChange: (route: PaymentRouteDraft) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("payment-gateway-control");
  const aliases = catalog.filter(
    (entry) =>
      entry.provider === route.provider &&
      entry.currencyCodes.includes(route.currencyCode) &&
      entry.paymentMethods.includes(route.paymentMethod),
  );
  const selectedAlias = aliases.some((entry) => entry.integrationKey === route.integrationKey);
  const update = (patch: Partial<PaymentRouteDraft>) => onChange({ ...route, ...patch });

  return (
    <div className="rounded-[20px] border border-border-light bg-surface-secondary/60 p-4 dark:border-white/8 dark:bg-white/[0.03]">
      <div className="grid gap-3 lg:grid-cols-12">
        <label className="lg:col-span-2">
          <span className="mb-1 block text-xs font-medium text-text-muted">{t("routeEditor.currency")}</span>
          <select value={route.currencyCode} onChange={(event) => update({ currencyCode: event.target.value as "EGP" | "USD" })} className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm">
            <option value="EGP">EGP</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label className="lg:col-span-2">
          <span className="mb-1 block text-xs font-medium text-text-muted">{t("routeEditor.method")}</span>
          <select value={route.paymentMethod} onChange={(event) => update({ paymentMethod: event.target.value })} className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm">
            <option value="CARD">CARD</option>
          </select>
        </label>
        <label className="lg:col-span-2">
          <span className="mb-1 block text-xs font-medium text-text-muted">{t("routeEditor.provider")}</span>
          <select value={route.provider} onChange={(event) => {
            const provider = event.target.value as PaymentGatewayControlProvider;
            const nextAlias = catalog.find((entry) => entry.provider === provider && entry.currencyCodes.includes(route.currencyCode) && entry.paymentMethods.includes(route.paymentMethod));
            update({ provider, integrationKey: nextAlias?.integrationKey ?? "" });
          }} className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm">
            {Array.from(new Set(catalog.filter((entry) => entry.currencyCodes.includes(route.currencyCode) && entry.paymentMethods.includes(route.paymentMethod)).map((entry) => entry.provider))).map((provider) => <option key={provider} value={provider}>{providerLabel(provider)}</option>)}
          </select>
        </label>
        <label className="lg:col-span-3">
          <span className="mb-1 block text-xs font-medium text-text-muted">{t("routeEditor.integration")}</span>
          <select value={selectedAlias ? route.integrationKey : ""} onChange={(event) => update({ integrationKey: event.target.value })} className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm">
            <option value="">{t("routeEditor.chooseIntegration")}</option>
            {aliases.map((entry) => <option key={entry.integrationKey} value={entry.integrationKey}>{entry.integrationKey}</option>)}
          </select>
        </label>
        <label className="lg:col-span-1">
          <span className="mb-1 block text-xs font-medium text-text-muted">{t("routeEditor.priority")}</span>
          <input type="number" min={0} max={1000} value={route.priority} onChange={(event) => update({ priority: Number(event.target.value) || 0 })} className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm" />
        </label>
        <button type="button" aria-label={t("routeEditor.remove")} onClick={onRemove} className="mt-5 inline-flex h-10 items-center justify-center rounded-2xl border border-rose-200 px-3 text-rose-600 hover:bg-rose-50 lg:col-span-1 dark:border-rose-400/20 dark:hover:bg-rose-400/10">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input type="checkbox" checked={route.enabled} onChange={(event) => update({ enabled: event.target.checked })} className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary" />
          {t("routeEditor.enabled")}
        </label>
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <span>{t("routeEditor.environment")}</span>
          <select value={route.environment} onChange={(event) => update({ environment: event.target.value as PaymentRouteDraft["environment"] })} className="rounded-2xl border border-border-light bg-surface-secondary px-3 py-1.5 text-sm">
            <option value="development">development</option>
            <option value="staging">staging</option>
            <option value="production">production</option>
          </select>
        </label>
      </div>
    </div>
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
  const [currentPassword, setCurrentPassword] = useState("");
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
  const canSave = Boolean(changedFields.length > 0 && reason.trim() && currentPassword);

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
      if (
        draft.currencyRoutes.length > 0 &&
        typeof window !== "undefined" &&
        !window.confirm(t("routingModal.confirmNewPaymentsOnly"))
      ) {
        return;
      }
      await updateMutation.mutateAsync({
        ...draft,
        reason: reason.trim(),
        stepUpChallengeId: stepUpChallengeId.trim(),
        stepUpCode: stepUpCode.trim(),
        currentPassword,
      });
      onClose();
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : t("routingModal.unableSaveRoutingConfiguration"),
      });
    } finally {
      setCurrentPassword("");
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

        <div className="rounded-[22px] border border-border-light bg-white/70 p-4 dark:border-white/8 dark:bg-white/[0.02]">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">{t("routeEditor.title")}</h3>
              <p className="mt-1 text-xs leading-5 text-text-secondary">{t("routeEditor.description")}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const first = snapshot.routeCatalog.find((entry) => entry.currencyCodes.includes("USD") && entry.paymentMethods.includes("CARD")) ?? snapshot.routeCatalog[0];
                if (!first) return;
                setDraft({
                  ...draft,
                  currencyRoutes: [
                    ...draft.currencyRoutes,
                    {
                      currencyCode: first.currencyCodes[0] ?? "USD",
                      paymentMethod: first.paymentMethods[0] ?? "CARD",
                      provider: first.provider,
                      integrationKey: first.integrationKey,
                      environment: "development",
                      enabled: false,
                      priority: 100,
                    },
                  ],
                });
              }}
            >
              <Plus className="h-4 w-4" />
              {t("routeEditor.add")}
            </Button>
          </div>
          <div className="space-y-3">
            {draft.currencyRoutes.length > 0 ? draft.currencyRoutes.map((route, index) => (
              <RouteEditorRow
                key={`${route.currencyCode}-${route.paymentMethod}-${index}`}
                route={route}
                catalog={snapshot.routeCatalog}
                onChange={(next) => setDraft({ ...draft, currencyRoutes: draft.currencyRoutes.map((item, itemIndex) => itemIndex === index ? next : item) })}
                onRemove={() => setDraft({ ...draft, currencyRoutes: draft.currencyRoutes.filter((_, itemIndex) => itemIndex !== index) })}
              />
            )) : <p className="text-sm text-text-secondary">{t("routeEditor.empty")}</p>}
          </div>
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
            <span className="text-sm font-medium text-text-primary">{locale === "ar" ? "كلمة المرور الحالية" : "Current password"}</span>
            <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    queueMicrotask(() => {
      setReason("");
      setStepUpChallengeId("");
      setStepUpCode("");
      setCurrentPassword("");
      setFeedback(null);
    });
  }, [isOpen]);

  if (!item) return null;

  const canSave = Boolean(reason.trim() && currentPassword);

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
        currentPassword,
      });
      onClose();
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : t("rollbackModal.unableRollbackConfiguration"),
      });
    } finally {
      setCurrentPassword("");
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

        <label className="space-y-2 block">
          <span className="text-sm font-medium text-text-primary">{locale === "ar" ? "كلمة المرور الحالية" : "Current password"}</span>
          <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-2xl border border-border-light bg-surface-secondary px-3 py-2 text-sm" />
        </label>

        <div className="flex flex-wrap gap-2">
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
  const currentUserQuery = useCurrentUser(true);
  const listQuery = useAdminPaymentGatewayControlList();
  const paymobHistoryQuery = useAdminPaymentGatewayControlHistory("provider", "PAYMOB");
  const stripeHistoryQuery = useAdminPaymentGatewayControlHistory("provider", "STRIPE");
  const routingHistoryQuery = useAdminPaymentGatewayControlHistory("routing", null);

  const [providerModal, setProviderModal] = useState<PaymentGatewayControlProvider | null>(null);
  const [routingModalOpen, setRoutingModalOpen] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<PaymentGatewayControlHistoryItem | null>(null);

  const allowedRoles = currentUserQuery.data?.roles.roles ?? [];
  if (!currentUserQuery.isLoading && !allowedRoles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN")) {
    return <AdminForbiddenView />;
  }

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

  const routeColumns = useMemo<ColumnDef<PaymentRoute>[]>(() => [
    {
      id: "currency",
      header: t("routeTable.currency"),
      accessor: (row) => row.currencyCode,
      cell: (row) => <Badge tone="primary">{row.currencyCode}</Badge>,
    },
    {
      id: "method",
      header: t("routeTable.method"),
      accessor: (row) => row.paymentMethod,
      cell: (row) => <span className="text-sm text-text-secondary">{row.paymentMethod}</span>,
    },
    {
      id: "provider",
      header: t("routeTable.provider"),
      accessor: (row) => row.provider,
      cell: (row) => <span className="text-sm font-semibold text-text-primary">{providerLabel(row.provider)}</span>,
    },
    {
      id: "integration",
      header: t("routeTable.integration"),
      accessor: (row) => row.integrationKey,
      cell: (row) => <code className="rounded-lg bg-surface-tertiary px-2 py-1 text-xs text-text-secondary">{row.integrationKey}</code>,
    },
    {
      id: "environment",
      header: t("routeTable.environment"),
      accessor: (row) => row.environment,
      cell: (row) => <span className="text-sm text-text-secondary">{row.environment}</span>,
    },
    {
      id: "priority",
      header: t("routeTable.priority"),
      accessor: (row) => row.priority,
      cell: (row) => <span className="text-sm text-text-secondary">{row.priority}</span>,
    },
    {
      id: "enabled",
      header: t("routeTable.status"),
      accessor: (row) => row.enabled,
      cell: (row) => <Badge tone={row.enabled ? "success" : "neutral"}>{row.enabled ? t("states.enabled") : t("states.disabled")}</Badge>,
    },
    {
      id: "readiness",
      header: t("routeTable.readiness"),
      accessor: (row) => routing?.routeReadiness.find((item) => item.route.currencyCode === row.currencyCode && item.route.paymentMethod === row.paymentMethod && item.route.provider === row.provider && item.route.integrationKey === row.integrationKey)?.ready ?? false,
      cell: (row) => {
        const readiness = routing?.routeReadiness.find((item) => item.route.currencyCode === row.currencyCode && item.route.paymentMethod === row.paymentMethod && item.route.provider === row.provider && item.route.integrationKey === row.integrationKey);
        return <div className="max-w-[18rem] space-y-1"><Badge tone={readiness?.ready ? "success" : "danger"}>{readiness?.ready ? t("states.ready") : t("states.notReady")}</Badge>{!readiness?.ready && readiness?.issues[0] ? <p className="text-xs text-rose-600">{readiness.issues[0]}</p> : null}</div>;
      },
    },
    {
      id: "source",
      header: t("routeTable.source"),
      accessor: (row) => row.source,
      cell: (row) => <Badge tone={row.source === "DATABASE" ? "primary" : "neutral"}>{row.source === "DATABASE" ? t("routeTable.database") : t("routeTable.environmentDefault")}</Badge>,
    },
    {
      id: "updatedBy",
      header: t("routeTable.updatedBy"),
      accessor: () => routingHistory[0]?.actorDisplayName ?? routingHistory[0]?.actorUserId ?? "-",
      cell: () => <span className="text-sm text-text-secondary">{routingHistory[0]?.actorDisplayName ?? routingHistory[0]?.actorUserId ?? "-"}</span>,
    },
    {
      id: "updatedAt",
      header: t("routeTable.updatedAt"),
      accessor: () => (routingHistory[0]?.changedAt ? new Date(routingHistory[0].changedAt).getTime() : 0),
      cell: () => <span className="text-sm text-text-secondary">{formatDateTime(routingHistory[0]?.changedAt ?? null, locale)}</span>,
    },
  ], [locale, routing, routingHistory, t]);

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

          <div className="mt-6 border-t border-border-light pt-6 dark:border-white/8">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-text-primary">{t("routeTable.title")}</h3>
              <p className="mt-1 text-sm text-text-secondary">{t("routeTable.description")}</p>
            </div>
            <DataTable
              data={routing.currencyRoutes}
              columns={routeColumns}
              getRowId={(row) => `${row.currencyCode}-${row.paymentMethod}-${row.provider}-${row.integrationKey}-${row.environment}`}
              loading={routingLoading}
              striped
              hoverable
              rowActionsHeader={t("routeTable.actions")}
              rowActions={() => (
                <Button type="button" size="sm" variant="outline" onClick={() => setRoutingModalOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  {t("actions.configure")}
                </Button>
              )}
              emptyState={{ title: t("routeTable.empty"), description: t("routeTable.emptyDescription") }}
            />
          </div>
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
