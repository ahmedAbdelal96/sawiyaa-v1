/**
 * Auth Logout API Route
 * Used by api-client to sign the user out.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookies,
  getLogoutEndpointForCurrentRole,
  getRefreshToken,
} from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  try {
    // Attempt to invalidate the token on the backend.
    const refreshToken = await getRefreshToken();
    const logoutEndpoint = await getLogoutEndpointForCurrentRole();

    if (refreshToken && logoutEndpoint) {
      fetch(logoutEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {
        // Ignore backend logout failures and continue clearing cookies locally.
      });
    }

    await clearAuthCookies();

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[API] Logout error:", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : String(error),
      });
    }

    await clearAuthCookies();

    return NextResponse.json({ success: true });
  }
}
