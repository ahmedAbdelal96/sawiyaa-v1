/**
 * Auth Refresh API Route
 * Called by api-client when the access token expires.
 */

import { NextRequest, NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  try {
    const success = await refreshAccessToken();

    if (success) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Failed to refresh token" },
      { status: 401 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[API] Refresh error:", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : String(error),
      });
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
