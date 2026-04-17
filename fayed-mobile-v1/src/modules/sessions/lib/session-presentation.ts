type TFunction = (key: string) => string;

export function mapSessionStatusLabel(status: string, t: TFunction) {
  switch (status) {
    case "PENDING_PAYMENT":
      return t("sessionStatusPendingPayment");
    case "SCHEDULED":
      return t("sessionStatusScheduled");
    case "COMPLETED":
      return t("sessionStatusCompleted");
    case "CANCELLED_BY_PATIENT":
    case "CANCELLED_BY_PRACTITIONER":
      return t("sessionStatusCancelled");
    case "MISSED_BY_PATIENT":
      return t("sessionStatusMissed");
    default:
      return t("sessionRuntimeStatusLabel");
  }
}

export function mapRuntimeProviderLabel(provider: string, t: TFunction) {
  switch (provider) {
    case "WHEREBY":
      return t("sessionProviderWhereby");
    case "ZOOM":
      return t("sessionProviderZoom");
    case "GOOGLE_MEET":
      return t("sessionProviderMeet");
    default:
      return t("sessionProviderSecureRoom");
  }
}
