import type { SignUpMode } from "@/components/auth/SignUpForm";

export function resolveSignUpMode(mode: string | undefined): SignUpMode {
  return mode === "practitioner" ? "practitioner" : "patient";
}
