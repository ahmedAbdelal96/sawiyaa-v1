import { redirect } from "next/navigation";
import {
  getDefaultRouteByRole,
  isRoleAllowedInArea,
  resolveRole,
  type RouteArea,
} from "@/config/route-access";
import { getUserData } from "./server";

function toLocalizedPath(locale: string, path: string): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

export async function requireGuest(locale: string) {
  const user = await getUserData();
  if (user) {
    const role = resolveRole(user.role) ?? "ADMIN";
    redirect(toLocalizedPath(locale, getDefaultRouteByRole(role)));
  }
}

export async function requireAuthenticatedArea(
  locale: string,
  area: Exclude<RouteArea, "public" | "auth" | "unknown">
) {
  const user = await getUserData();
  if (!user) {
    redirect(toLocalizedPath(locale, "/signin"));
  }

  const role = resolveRole(user.role);
  if (!role || !isRoleAllowedInArea(role, area)) {
    redirect(toLocalizedPath(locale, getDefaultRouteByRole(role ?? "ADMIN")));
  }

  return user;
}
