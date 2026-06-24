"use client";

import { useEffect, useRef } from "react";
import { seedAuthStore, type AuthUser, type AuthTenant } from "@/stores/auth-store";

type Props = {
  user: AuthUser | null;
  tenant: AuthTenant | null;
};

/**
 * Seeds the auth store from SSR-provided user data after mount.
 *
 * Updating the store during render causes React warnings once header/user
 * components subscribe to the same store, so the bridge runs inside an effect.
 */
export default function StoreInitializer({ user, tenant }: Props) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) {
      return;
    }

    initialized.current = true;
    seedAuthStore({ user, tenant });
  }, [tenant, user]);

  return null;
}
