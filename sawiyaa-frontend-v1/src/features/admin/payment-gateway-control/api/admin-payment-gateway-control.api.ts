import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  PaymentGatewayControlHistoryItem,
  PaymentGatewayControlListResponse,
  PaymentGatewayControlProvider,
  PaymentGatewayControlRevisionResponse,
  PaymentGatewayControlScope,
  PaymentGatewayControlValidationResult,
  PaymentRoutingDraft,
  PaymentRoutingRuntimeSnapshot,
  PaymentRouteCatalogEntry,
  PaymentGatewayMutationSecurity,
  PaymobGatewayControlRuntimeSnapshot,
  StripeGatewayControlRuntimeSnapshot,
} from "../types/admin-payment-gateway-control.types";

export async function listAdminPaymentGatewayControl() {
  const response = await httpClient.get<ApiPayload<PaymentGatewayControlListResponse>>(
    "/admin/payment-gateway-control",
  );
  return extractData(response.data);
}

export async function getAdminPaymentGatewayControl(provider: PaymentGatewayControlProvider) {
  const response = await httpClient.get<ApiPayload<{ item: PaymobGatewayControlRuntimeSnapshot | StripeGatewayControlRuntimeSnapshot }>>(
    `/admin/payment-gateway-control/providers/${provider}`,
  );
  return extractData(response.data);
}

export async function getAdminPaymentGatewayControlRouting() {
  const response = await httpClient.get<ApiPayload<{ item: PaymentRoutingRuntimeSnapshot }>>(
    "/admin/payment-gateway-control/routing",
  );
  return extractData(response.data);
}

export async function getAdminPaymentGatewayRouteCapabilities() {
  const response = await httpClient.get<ApiPayload<{ items: PaymentRouteCatalogEntry[] }>>(
    "/admin/payment-gateway-control/routing/capabilities",
  );
  return extractData(response.data);
}

export async function getAdminPaymentGatewayControlHistory(
  scope: PaymentGatewayControlScope,
  provider: PaymentGatewayControlProvider | null,
) {
  const url =
    scope === "routing"
      ? "/admin/payment-gateway-control/routing/history"
      : `/admin/payment-gateway-control/providers/${provider}/history`;
  const response = await httpClient.get<ApiPayload<{ items: PaymentGatewayControlHistoryItem[] }>>(url);
  return extractData(response.data);
}

export async function validateAdminPaymentGatewayControl(
  scope: PaymentGatewayControlScope,
  provider: PaymentGatewayControlProvider | null,
  draft: PaymobGatewayControlRuntimeSnapshot | StripeGatewayControlRuntimeSnapshot | PaymentRoutingDraft,
) {
  const url =
    scope === "routing"
      ? "/admin/payment-gateway-control/routing/validate"
      : `/admin/payment-gateway-control/providers/${provider}/validate`;
  const response = await httpClient.post<ApiPayload<PaymentGatewayControlValidationResult>>(
    url,
    draft,
  );
  return extractData(response.data);
}

export async function requestAdminPaymentGatewayControlStepUp(
  scope: PaymentGatewayControlScope,
  provider: PaymentGatewayControlProvider | null,
) {
  const url =
    scope === "routing"
      ? "/admin/payment-gateway-control/routing/step-up"
      : `/admin/payment-gateway-control/providers/${provider}/step-up`;
  const response = await httpClient.post<
    ApiPayload<{ challengeId: string; maskedTarget: string; expiresAt: string }>
  >(url);
  return extractData(response.data);
}

export async function updateAdminPaymentGatewayControl(
  scope: PaymentGatewayControlScope,
  provider: PaymentGatewayControlProvider | null,
  payload:
    | ({ reason: string; stepUpChallengeId: string; stepUpCode: string } & PaymentGatewayMutationSecurity & PaymobGatewayControlRuntimeSnapshot)
    | ({ reason: string; stepUpChallengeId: string; stepUpCode: string } & PaymentGatewayMutationSecurity & StripeGatewayControlRuntimeSnapshot)
    | ({ reason: string; stepUpChallengeId: string; stepUpCode: string } & PaymentGatewayMutationSecurity & PaymentRoutingDraft),
) {
  const url =
    scope === "routing"
      ? "/admin/payment-gateway-control/routing"
      : `/admin/payment-gateway-control/providers/${provider}`;
  const response = await httpClient.patch<ApiPayload<PaymentGatewayControlRevisionResponse>>(
    url,
    payload,
  );
  return extractData(response.data);
}

export async function rollbackAdminPaymentGatewayControl(
  scope: PaymentGatewayControlScope,
  provider: PaymentGatewayControlProvider | null,
  payload: {
    reason: string;
    revisionId: string;
    stepUpChallengeId: string;
    stepUpCode: string;
    currentPassword: string;
  },
) {
  const url =
    scope === "routing"
      ? "/admin/payment-gateway-control/routing/rollback"
      : `/admin/payment-gateway-control/providers/${provider}/rollback`;
  const response = await httpClient.post<ApiPayload<PaymentGatewayControlRevisionResponse>>(
    url,
    payload,
  );
  return extractData(response.data);
}
