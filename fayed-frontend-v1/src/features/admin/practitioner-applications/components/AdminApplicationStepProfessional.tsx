"use client";

type ComparisonRow = {
  key: string;
  label: string;
  current: string;
  requested: string;
};

type PriceRow = {
  label: string;
  value: string;
};

type Props = {
  profileRows: Array<{ label: string; value: string }>;
  bio: string;
  prices: PriceRow[];
  differences: ComparisonRow[];
  noDifferencesLabel: string;
  liveValueLabel: string;
  requestedValueLabel: string;
  bioLabel: string;
  differencesLabel: string;
};

export default function AdminApplicationStepProfessional({
  profileRows,
  bio,
  prices,
  differences,
  noDifferencesLabel,
  liveValueLabel,
  requestedValueLabel,
  bioLabel,
  differencesLabel,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-3 sm:grid-cols-2">
            {profileRows.map((row) => (
              <div key={row.label} className="rounded-xl border border-gray-100 bg-surface-secondary/70 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{row.label}</p>
                <p className="mt-1 text-sm text-gray-800 dark:text-white">{row.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-gray-100 bg-surface-secondary/70 p-3 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{bioLabel}</p>
            <p className="mt-1 text-sm leading-6 text-gray-700 dark:text-gray-200">{bio}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-3 sm:grid-cols-2">
            {prices.map((price) => (
              <div key={price.label} className="rounded-xl border border-gray-100 bg-surface-secondary/70 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{price.label}</p>
                <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{price.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-semibold text-gray-800 dark:text-white">{differencesLabel}</p>
        <div className="mt-3 space-y-2">
          {differences.length > 0 ? (
            differences.map((item) => (
              <div key={item.key} className="rounded-xl border border-orange-100 bg-orange-50/40 p-3 dark:border-orange-900/40 dark:bg-orange-900/10">
                <p className="text-sm font-semibold text-gray-800 dark:text-white">{item.label}</p>
                <div className="mt-1 grid gap-1 text-xs text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                  <span>{liveValueLabel}: {item.current}</span>
                  <span>{requestedValueLabel}: {item.requested}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{noDifferencesLabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}
