"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { USER_ROLE_COOKIE } from "./constants";
import type { SessionRole } from "./roles";

function readRoleCookie(): SessionRole | null {
  return Cookies.get(USER_ROLE_COOKIE) ?? null;
}

/**
 * Keeps a lightweight, cross-tab aware view of the current role.
 * This is used to suppress admin-only query owners when the browser session
 * has switched to a non-admin role in another tab.
 */
export function useSessionRole(): SessionRole | null {
  const [role, setRole] = useState<SessionRole | null>(() => readRoleCookie());

  useEffect(() => {
    const sync = () => setRole(readRoleCookie());

    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);

    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return role;
}

