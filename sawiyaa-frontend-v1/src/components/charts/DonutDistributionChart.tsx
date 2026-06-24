import type { ApexOptions } from "apexcharts";
import { ApexChart } from "./ApexChart";

type DonutDistributionChartProps = {
  locale: string;
  labels: string[];
  values: number[];
  colors?: string[];
  height?: number;
};

function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

const DEFAULT_COLORS = ["#3D9286", "#5E88D8", "#D99356", "#A8B3BC", "#8F7FD2"];

export function DonutDistributionChart({
  locale,
  labels,
  values,
  colors = DEFAULT_COLORS,
  height = 300,
}: DonutDistributionChartProps) {
  const options: ApexOptions = {
    chart: { toolbar: { show: false } },
    labels,
    colors,
    dataLabels: {
      enabled: true,
      formatter: (value) => {
        const numeric = Array.isArray(value) ? Number(value[0]) : Number(value);
        return `${Math.round(Number.isFinite(numeric) ? numeric : 0)}%`;
      },
    },
    legend: {
      position: "bottom",
      fontSize: "12px",
      labels: { colors: "#56656B" },
    },
    stroke: { width: 0 },
    tooltip: {
      y: {
        formatter: (value) => {
          const numeric = Array.isArray(value) ? Number(value[0]) : Number(value);
          return new Intl.NumberFormat(normalizeLocale(locale)).format(
            Math.round(Number.isFinite(numeric) ? numeric : 0),
          );
        },
      },
    },
  };

  return <ApexChart type="donut" height={height} options={options} series={values} />;
}
