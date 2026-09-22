import type { MobileNextSession } from "../../sessions/next-session";

export type PatientHomePrimaryState =
  | "PAYMENT_REQUIRED"
  | "JOINABLE"
  | "UPCOMING"
  | "DISCOVERY";

export function resolvePatientHomePrimaryState(
  session: MobileNextSession | null | undefined,
): PatientHomePrimaryState {
  if (!session) return "DISCOVERY";
  if (session.operational.actions.canPay) return "PAYMENT_REQUIRED";
  if (session.operational.join.allowed || session.operational.actions.canJoin) {
    return "JOINABLE";
  }
  return "UPCOMING";
}
