"use client";

import Avatar from "@/components/ui/avatar/Avatar";
import { User, AlertTriangle, ShieldCheck } from "lucide-react";

type ComparisonRow = {
  key: string;
  label: string;
  current: string;
  requested: string;
};

type Props = {
  avatarUrl: string | null;
  name: string;
  email: string;
  phone: string;
  country: string;
  accountStatus: string;
  photoStatus: string;
  noPhotoLabel: string;
  guidance: string;
  missingItems: string[];
  identityDifferences: ComparisonRow[];
  liveValueLabel: string;
  requestedValueLabel: string;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  countryLabel: string;
  accountStatusLabel: string;
};

export default function AdminApplicationStepIdentity({
  avatarUrl,
  name,
  email,
  phone,
  country,
  accountStatus,
  photoStatus,
  noPhotoLabel,
  guidance,
  missingItems,
  identityDifferences,
  liveValueLabel,
  requestedValueLabel,
  nameLabel,
  emailLabel,
  phoneLabel,
  countryLabel,
  accountStatusLabel,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* Photo Card */}
        <div className="flex flex-col items-center rounded-2xl border border-border-light bg-surface p-4 text-center shadow-2xs dark:bg-surface-secondary/40">
          <div className="h-32 w-32 overflow-hidden rounded-2xl border border-border-light bg-surface-secondary shadow-xs">
            <Avatar
              src={avatarUrl}
              name={name}
              size="custom"
              className="h-full w-full rounded-2xl"
              imgClassName="rounded-2xl"
            />
          </div>
          <p className="mt-2.5 text-xs font-bold text-text-secondary">{photoStatus}</p>
        </div>

        {/* Identity Details Card */}
        <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-2xs dark:bg-surface-secondary/40 space-y-3">
          <div className="flex items-center gap-2 border-b border-border-light pb-2">
            <User className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold text-text-primary dark:text-white/95">
              بيانات الهوية والحساب
            </h2>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <ReviewRow label={nameLabel} value={name} />
            <ReviewRow label={emailLabel} value={email} />
            <ReviewRow label={phoneLabel} value={phone} />
            <ReviewRow label={countryLabel} value={country} />
            <ReviewRow label={accountStatusLabel} value={accountStatus} />
          </div>

          {guidance && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs font-semibold text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-200">
              {guidance}
            </div>
          )}

          {missingItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-text-muted">العناصر الناقصة:</span>
              {missingItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Diffs Card */}
      {identityDifferences.length > 0 && (
        <div className="rounded-2xl border border-border-light bg-surface p-4 shadow-2xs dark:bg-surface-secondary/40">
          <div className="flex items-center gap-2 border-b border-border-light pb-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-xs font-bold text-text-primary dark:text-white/95">
              الفروق المسجلة
            </h3>
          </div>

          <div className="mt-3 space-y-2">
            {identityDifferences.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-800/60 dark:bg-amber-950/30"
              >
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">{item.label}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs">
                  <span className="text-text-muted">
                    {liveValueLabel}: <strong className="text-text-primary dark:text-white/90">{item.current}</strong>
                  </span>
                  <span className="text-amber-800 dark:text-amber-300">
                    {requestedValueLabel}: <strong className="font-bold">{item.requested}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-light bg-surface-secondary/30 p-2.5 dark:bg-surface-secondary/20">
      <p className="text-[11px] font-semibold text-text-muted">{label}</p>
      <p className="mt-0.5 text-xs font-bold text-text-primary dark:text-white/95">{value || "-"}</p>
    </div>
  );
}
