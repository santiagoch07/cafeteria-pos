"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { formatMXN } from "@/lib/format";

type HoraRow = { hora: string | number; total: number };

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border-hi rounded-lg px-3 py-2 text-sm">
      <p className="font-medium text-muted">{label}:00 hrs</p>
      <p className="font-semibold text-text-strong">{formatMXN(payload[0].value)}</p>
    </div>
  );
}

export default function VentasPorHoraChart({ data }: { data: HoraRow[] }) {
  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="hora"
          tick={{ fontSize: 11, fill: "#A3A3A3" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,217,68,0.07)" }} />
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.total === maxTotal && entry.total > 0 ? "#FFD944" : "#404040"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
