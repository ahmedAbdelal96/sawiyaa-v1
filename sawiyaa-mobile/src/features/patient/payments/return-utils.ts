type ReturnFlagsInput = {
  redirectStatus?: string | null;
  success?: string | null;
  pending?: string | null;
};

function normalizeStatusToken(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (["succeeded", "success", "paid"].includes(normalized)) {
    return "succeeded";
  }

  if (["failed", "failure", "error"].includes(normalized)) {
    return "failed";
  }

  if (["canceled", "cancelled", "cancel", "aborted"].includes(normalized)) {
    return "canceled";
  }

  return normalized;
}

function normalizeBooleanFlag(value: string | null | undefined): boolean | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();

  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }

  return null;
}

function parseUrlLikeParams(input: string): URLSearchParams {
  const value = input.trim();

  if (!value) {
    return new URLSearchParams();
  }

  if (value.startsWith("?")) {
    return new URLSearchParams(value.slice(1));
  }

  if (value.startsWith("#")) {
    return new URLSearchParams(value.slice(1));
  }

  return new URLSearchParams(value);
}

function getParam(searchParams: URLSearchParams, key: string): string | null {
  const value = searchParams.get(key);
  if (!value) return null;

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function normalizePaymentRedirectStatus(input: ReturnFlagsInput): string | null {
  const direct = normalizeStatusToken(input.redirectStatus);
  if (direct) {
    return direct;
  }

  const success = normalizeBooleanFlag(input.success);
  const pending = normalizeBooleanFlag(input.pending);

  if (success === true && pending === false) {
    return "succeeded";
  }

  if (success === false && pending === false) {
    return "failed";
  }

  return null;
}

export function extractHostedCheckoutReturnParams(url: string): Record<string, string> {
  try {
    const parsed = new URL(url);
    const hashParams = parseUrlLikeParams(parsed.hash);
    const queryParams = parsed.searchParams;

    const read = (...keys: string[]) => {
      for (const key of keys) {
        const fromQuery = getParam(queryParams, key);
        if (fromQuery) return fromQuery;

        const fromHash = getParam(hashParams, key);
        if (fromHash) return fromHash;
      }

      return null;
    };

    const redirectStatus = read("redirect_status", "redirectStatus", "status");
    const success = read("success");
    const pending = read("pending");
    const order = read("order", "merchant_order_id");
    const providerReference = read("providerReference", "order", "id", "merchant_order_id");

    return Object.fromEntries(
      [
        ["redirect_status", redirectStatus],
        ["redirectStatus", redirectStatus],
        ["success", success],
        ["pending", pending],
        ["order", order],
        ["providerReference", providerReference],
      ].filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
  } catch {
    return {};
  }
}
