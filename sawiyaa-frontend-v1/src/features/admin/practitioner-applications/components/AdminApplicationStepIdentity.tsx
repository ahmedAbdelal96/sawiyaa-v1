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
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
          <div className="h-[160px] w-full overflow-hidden rounded-xl border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
            <Avatar
              src={avatarUrl}
              name={name}
              size="custom"
              className="h-full w-full rounded-xl"
              imgClassName="rounded-xl"
            />
          </div>
          <p className="mt-2.5 text-xs font-bold text-gray-700 dark:text-gray-300">{photoStatus}</p>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <ReviewRow label={nameLabel} value={name} />
            <ReviewRow label={emailLabel} value={email} />
            <ReviewRow label={phoneLabel} value={phone} />
            <ReviewRow label={countryLabel} value={country} />
            <ReviewRow label={accountStatusLabel} value={accountStatus} />
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-xs font-bold text-sky-950 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
            {guidance}
          </div>
          <div className="flex flex-wrap gap-2">
            {(missingItems.length > 0 ? missingItems : ["-"]).map((item) => (
              <span
                key={item}
                className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
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
            <div key={item.key} className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-800 dark:bg-amber-950/50">
              <p className="text-sm font-extrabold text-amber-950 dark:text-amber-100">{item.label}</p>
              <div className="mt-1.5 grid gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 sm:grid-cols-2">
                <span>{liveValueLabel}: {item.current}</span>
                <span>{requestedValueLabel}: {item.requested}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">-</p>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{label}</p>
      <p className="mt-1 text-base font-extrabold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
