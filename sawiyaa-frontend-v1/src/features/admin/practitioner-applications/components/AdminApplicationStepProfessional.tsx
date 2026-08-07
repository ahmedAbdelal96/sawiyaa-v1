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
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-3 sm:grid-cols-2">
            {profileRows.map((row) => (
              <div key={row.label} className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{row.label}</p>
                <p className="mt-1 text-base font-extrabold text-gray-900 dark:text-white">{row.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3.5 rounded-xl border border-gray-200 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{bioLabel}</p>
            <p className="mt-1.5 text-sm font-semibold leading-relaxed text-gray-900 dark:text-gray-100">{bio}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-3 sm:grid-cols-2">
            {prices.map((price) => (
              <div key={price.label} className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{price.label}</p>
                <p className="mt-1 text-base font-extrabold text-gray-900 dark:text-white">{price.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-extrabold text-gray-900 dark:text-white">{differencesLabel}</p>
        <div className="mt-3 space-y-2">
          {differences.length > 0 ? (
            differences.map((item) => (
              <div key={item.key} className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-800 dark:bg-amber-950/50">
                <p className="text-sm font-extrabold text-amber-950 dark:text-amber-100">{item.label}</p>
                <div className="mt-1.5 grid gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 sm:grid-cols-2">
                  <span>{liveValueLabel}: {item.current}</span>
                  <span>{requestedValueLabel}: {item.requested}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{noDifferencesLabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}
