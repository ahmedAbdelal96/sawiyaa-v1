"use client";

import Avatar from "@/components/ui/avatar/Avatar";

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
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-gray-100 bg-surface-secondary/70 p-4 dark:border-gray-800 dark:bg-gray-800/50">
          <div className="h-[160px] w-full overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <Avatar
              src={avatarUrl}
              name={name}
              size="custom"
              className="h-full w-full rounded-xl"
              imgClassName="rounded-xl"
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{photoStatus}</p>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <ReviewRow label={nameLabel} value={name} />
            <ReviewRow label={emailLabel} value={email} />
            <ReviewRow label={phoneLabel} value={phone} />
            <ReviewRow label={countryLabel} value={country} />
            <ReviewRow label={accountStatusLabel} value={accountStatus} />
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-200">
            {guidance}
          </div>
          <div className="flex flex-wrap gap-2">
            {(missingItems.length > 0 ? missingItems : ["-"]).map((item) => (
              <span
                key={item}
                className="inline-flex items-center rounded-full border border-warning-200 bg-warning-50 px-3 py-1 text-xs font-medium text-warning-800 dark:border-warning-900/40 dark:bg-warning-900/10 dark:text-warning-100"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {identityDifferences.length > 0 ? (
          identityDifferences.map((item) => (
            <div key={item.key} className="rounded-xl border border-orange-100 bg-orange-50/40 p-3 dark:border-orange-900/40 dark:bg-orange-900/10">
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{item.label}</p>
              <div className="mt-1 grid gap-1 text-xs text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                <span>{liveValueLabel}: {item.current}</span>
                <span>{requestedValueLabel}: {item.requested}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">-</p>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-sm text-gray-800 dark:text-gray-100">{value}</p>
    </div>
  );
}
