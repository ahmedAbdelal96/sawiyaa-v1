import type { ApexOptions } from "apexcharts";
import { ApexChart } from "./ApexChart";

type AreaTrendChartProps = {
  locale: string;
  categories: string[];
  seriesName: string;
  values: number[];
  height?: number;
  color?: string;
  comparisonSeriesName?: string;
  comparisonValues?: number[];
  comparisonColor?: string;
};

function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

export function AreaTrendChart({
  locale,
  categories,
  seriesName,
  values,
  height = 300,
  color = "#3D9286",
  comparisonSeriesName,
  comparisonValues,
  comparisonColor = "#B7A4FF",
}: AreaTrendChartProps) {
  const maxVisibleLabels = 8;
  const labelStep =
    categories.length <= maxVisibleLabels ? 1 : Math.ceil(categories.length / maxVisibleLabels);

  const hasComparison =
    Boolean(comparisonSeriesName) &&
    Array.isArray(comparisonValues) &&
    comparisonValues.length === values.length;

  const series = hasComparison
    ? [
        { name: seriesName, data: values },
        { name: comparisonSeriesName as string, data: comparisonValues as number[] },
      ]
    : [{ name: seriesName, data: values }];

  const options: ApexOptions = {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: hasComparison ? [color, comparisonColor] : [color],
    stroke: { curve: "smooth", width: 3 },
    fill: hasComparison
      ? {
          type: ["gradient", "solid"],
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.35,
            opacityTo: 0.03,
            stops: [0, 100],
          },
        }
      : {
          type: "gradient",
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.35,
            opacityTo: 0.02,
            stops: [0, 100],
          },
        },
    dataLabels: { enabled: false },
    grid: {
      borderColor: "rgba(122,136,145,0.16)",
      strokeDashArray: 4,
      padding: { left: 4, right: 8 },
    },
    xaxis: {
      categories,
      tickAmount: Math.min(maxVisibleLabels, categories.length),
      labels: {
        style: { colors: "#7A8891", fontSize: "12px" },
        hideOverlappingLabels: true,
        rotate: categories.length > maxVisibleLabels ? -35 : 0,
        trim: true,
        formatter: (value, _timestamp, opts) => {
          // Apex passes the category index as `opts.i` for x-axis labels.
          const pointIndex = (opts as any)?.i ?? 0;
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
        formatter: (value) =>
          new Intl.NumberFormat(normalizeLocale(locale)).format(Math.round(value)),
      },
    },
  };

  return (
    <ApexChart type="area" height={height} options={options} series={series} />
  );
}
