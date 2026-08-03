import React from "react";
import { Redirect } from "expo-router";

/**
 * Auth Index Route Handler
 *
 * Redirects any navigate request to /(auth) directly to the primary patient sign-in screen,
 * eliminating duplicate root route collisions with the Public Home screen at `/`.
 */
export default function AuthIndexRedirect() {
  return <Redirect href="/(auth)/signin/patient" />;
}
