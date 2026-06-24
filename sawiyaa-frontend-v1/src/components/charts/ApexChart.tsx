"use client";

import dynamic from "next/dynamic";
import type {
  ApexAxisChartSeries,
  ApexNonAxisChartSeries,
  ApexOptions,
} from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type ApexChartProps = {
  type: "line" | "area" | "bar" | "donut";
  options: ApexOptions;
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  height: number;
};

export function ApexChart({ type, options, series, height }: ApexChartProps) {
  return (
    <div dir="ltr">
      <ReactApexChart type={type} options={options} series={series} height={height} />
    </div>
  );
}
