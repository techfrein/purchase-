"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";

/** Recharts needs a measured parent; skip SSR until the container has layout. */
function ChartFrame({ height, children }: { height: string; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <div className={`${height} w-full min-w-0`}>
      {ready ? children : null}
    </div>
  );
}

/** Donut-style gauge for a single percentage (e.g. approval rate). */
export function DonutGauge({
  value,
  label,
  sublabel,
}: {
  value: number;
  label: string;
  sublabel?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const data = [{ name: "v", value: pct, fill: "#1aa356" }];
  return (
    <ChartFrame height="h-52">
      <div className="relative h-full w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            data={data}
            startAngle={220}
            endAngle={-40}
            barSize={18}
          >
            <RadialBar background={{ fill: "#eef1ef" }} dataKey="value" cornerRadius={20} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-slate-900">{pct}%</div>
          <div className="text-xs font-medium text-slate-400">{label}</div>
          {sublabel && <div className="mt-0.5 text-[0.7rem] text-slate-400">{sublabel}</div>}
        </div>
      </div>
    </ChartFrame>
  );
}

/** Rounded vertical bars, highlighting the tallest — matches the reference. */
export function BarTrend({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="w-full min-w-0">
      <ChartFrame height="h-44">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%">
            <Bar dataKey="value" radius={[999, 999, 999, 999]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.value >= max ? "#1aa356" : "#dcefe2"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <div className="mt-2 flex justify-between px-1 text-[0.7rem] font-medium text-slate-400">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center">{d.label}</span>
        ))}
      </div>
    </div>
  );
}
