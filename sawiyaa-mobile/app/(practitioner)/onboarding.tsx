import React from "react";
import { Redirect } from "expo-router";

/** Compatibility redirect: practitioner applications are managed on Web only. */
export default function PractitionerOnboardingRedirect() {
  return <Redirect href="/(practitioner)/application-status" />;
}
