import type { ApexOptions } from "apexcharts";
import { ApexChart } from "./ApexChart";

type HorizontalCategoryChartProps = {
  locale: string;
  categories: string[];
  values: number[];
  colors: string[];
  height?: number;
};

function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

export function HorizontalCategoryChart({
  locale,
  categories,
  values,
  colors,
  height = 280,
}: HorizontalCategoryChartProps) {
  const options: ApexOptions = {
    chart: { toolbar: { show: false } },
    colors,
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 8,
        barHeight: "50%",
        distributed: true,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (value) => {
        const numeric = Array.isArray(value) ? Number(value[0]) : Number(value);
        return new Intl.NumberFormat(normalizeLocale(locale)).format(
          Math.round(Number.isFinite(numeric) ? numeric : 0),
        );
      },
      style: {
        colors: ["#2B353A"],
        fontSize: "11px",
        fontWeight: "600",
      },
    },
    xaxis: {
      categories,
      labels: { style: { colors: "#7A8891", fontSize: "12px" } },
    },
    yaxis: {
      labels: { style: { colors: "#56656B", fontSize: "12px" } },
    },
    grid: {
      borderColor: "rgba(122,136,145,0.16)",
      strokeDashArray: 4,
    },
    legend: { show: false },
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

  return (
    <ApexChart
      type="bar"
      height={height}
      options={options}
      series={[{ name: "value", data: values }]}
    />
  );
}
