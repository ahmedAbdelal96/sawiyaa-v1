"use client";

import { useTranslations } from "next-intl";
import {
  User,
  Mail,
  Phone,
  Shield,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Clock,
  Layers,
} from "lucide-react";
import { AdminStatusBadge } from "@/components/shared/admin/AdminDashboardKit";
import { ADMIN_USER_ROLE_LABEL_KEYS } from "../../utils/admin-users-format";
import type { AdminUserDetails } from "../../types/admin-users.types";

export interface PermissionSummaryCardProps {
  user: AdminUserDetails;
  totalCatalogCount: number;
  roleAllowedCount: number;
  explicitAllowCount: number;
  explicitDenyCount: number;
  pendingChangesCount: number;
}

export function PermissionSummaryCard({
  user,
  totalCatalogCount,
  roleAllowedCount,
  explicitAllowCount,
  explicitDenyCount,
  pendingChangesCount,
}: PermissionSummaryCardProps) {
  const t = useTranslations("admin-users");

  const displayName = user.displayName ?? user.emails?.[0] ?? user.id;
  const primaryEmail = user.emails?.[0] ?? null;
  const primaryPhone = user.phones?.[0] ?? null;

  // Get user initials for avatar
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-3">
      {/* Top Banner / User Identification Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border-light bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-4 text-white shadow-lg sm:p-5 dark:border-white/10">
        <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          {/* User Info Row */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/20 text-sm font-black tracking-wider text-teal-300 ring-1 ring-teal-400/30 backdrop-blur-md">
              {initials || <User className="h-6 w-6" />}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base md:text-lg font-black text-white">
                  {displayName}
                </h2>
                <AdminStatusBadge tone="muted">
                  {t(`status.${user.status}`)}
                </AdminStatusBadge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                {primaryEmail ? (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-teal-400" />
                    <span className="truncate">{primaryEmail}</span>
                  </span>
                ) : null}

                {primaryPhone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-teal-400" />
                    <span>{primaryPhone}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Assigned Roles Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 md:pt-0 border-t border-white/10 md:border-t-0">
            <span className="text-[11px] font-bold text-slate-400 me-1">
              {t("detail.roles.title")}:
            </span>
            {user.roles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 border border-teal-400/30 px-3 py-1 text-xs font-bold text-teal-200 backdrop-blur-md"
              >
                <Shield className="h-3 w-3 text-teal-300" />
                {t(ADMIN_USER_ROLE_LABEL_KEYS[role])}
              </span>
            ))}
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 pt-3.5 border-t border-white/10 sm:grid-cols-3 lg:grid-cols-5">
          {/* Total Catalog */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/10 p-2.5 backdrop-blur-md border border-white/10">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-500/20 text-slate-300">
              <Layers className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 truncate">
                {t("permissions.stats.total")}
              </p>
              <p className="text-sm font-black text-white">{totalCatalogCount}</p>
            </div>
          </div>

          {/* Role Granted */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/10 p-2.5 backdrop-blur-md border border-white/10">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/90 truncate">
                {t("permissions.stats.roleAllowed")}
              </p>
              <p className="text-sm font-black text-white">{roleAllowedCount}</p>
            </div>
          </div>

          {/* Explicit Allow */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/10 p-2.5 backdrop-blur-md border border-white/10">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200/90 truncate">
                {t("permissions.stats.explicitAllow")}
              </p>
              <p className="text-sm font-black text-white">{explicitAllowCount}</p>
            </div>
          </div>

          {/* Explicit Deny */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/10 p-2.5 backdrop-blur-md border border-white/10">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-200/90 truncate">
                {t("permissions.stats.explicitDeny")}
              </p>
              <p className="text-sm font-black text-white">{explicitDenyCount}</p>
            </div>
          </div>

          {/* Unsaved Pending */}
          <div className="col-span-2 sm:col-span-1 flex items-center gap-2.5 rounded-2xl bg-amber-500/20 p-2.5 backdrop-blur-md border border-amber-400/30">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/30 text-amber-300">
              <Clock className="h-4 w-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200 truncate">
                {t("permissions.stats.pending")}
              </p>
              <p className="text-sm font-black text-white">{pendingChangesCount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
