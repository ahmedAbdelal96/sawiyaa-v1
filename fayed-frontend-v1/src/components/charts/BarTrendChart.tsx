import type { ApexOptions } from "apexcharts";
import { ApexChart } from "./ApexChart";

type BarTrendChartProps = {
  locale: string;
  categories: string[];
  seriesName: string;
  values: number[];
  currencyCode?: string;
  height?: number;
  color?: string;
  colors?: string[];
  distributed?: boolean;
};

function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

export function BarTrendChart({
  locale,
  categories,
  seriesName,
  values,
  currencyCode,
  height = 260,
  color = "#5E88D8",
  colors,
  distributed = false,
}: BarTrendChartProps) {
  const maxVisibleLabels = 8;
  const labelStep =
    categories.length <= maxVisibleLabels ? 1 : Math.ceil(categories.length / maxVisibleLabels);

  const chartColors = colors && colors.length > 0 ? colors : [color];

  const options: ApexOptions = {
    chart: { toolbar: { show: false } },
    colors: chartColors,
    fill: {
      type: "solid",
      opacity: 1,
    },
    dataLabels: { enabled: false },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: "42%",
        distributed,
      },
    },
    grid: {
      borderColor: "rgba(122,136,145,0.16)",
      strokeDashArray: 4,
    },
    xaxis: {
      categories,
      tickAmount: Math.min(maxVisibleLabels, categories.length),
      labels: {
        style: { colors: "#7A8891", fontSize: "12px" },
        hideOverlappingLabels: true,
        rotate: categories.length > maxVisibleLabels ? -35 : 0,
        formatter: (value, _timestamp, opts) => {
          const pointIndex = opts?.dataPointIndex ?? 0;
          const isFirstOrLast =
            pointIndex === 0 || pointIndex === Math.max(categories.length - 1, 0);
          return isFirstOrLast || pointIndex % labelStep === 0 ? String(value) : "";
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: "#7A8891", fontSize: "12px" },
        formatter: (value) =>
          new Intl.NumberFormat(normalizeLocale(locale)).format(Math.round(value)),
      },
    },
    tooltip: {
      y: {
        formatter: (value) => {
          if (!currencyCode) {
            return new Intl.NumberFormat(normalizeLocale(locale)).format(Math.round(value));
          }
          return new Intl.NumberFormat(normalizeLocale(locale), {
            style: "currency",
            currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).format(value);
        },
      },
    },
  };

  return (
    <ApexChart
      type="bar"
      height={height}
      options={options}
      series={[{ name: seriesName, data: values }]}
    />
  );
}
