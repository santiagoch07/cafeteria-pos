"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { formatMXN } from "@/lib/format";

type WFBar = { name: string; base: number; valor: number; color: string };

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  const valorEntry = payload.find((p) => p.dataKey === "valor");
  if (!valorEntry) return null;
  return (
    <div className="bg-surface border border-border-hi rounded-lg px-3 py-2 text-sm">
      <p className="font-medium text-muted">{label}</p>
      <p className="font-semibold text-text-strong">{formatMXN(valorEntry.value)}</p>
    </div>
  );
}

export default function WaterfallChart({ data }: { data: WFBar[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barCategoryGap="25%">
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#A3A3A3" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        {/* Base invisible que eleva la barra de valor */}
        <Bar dataKey="base" stackId="s" fill="transparent" isAnimationActive={false} />
        {/* Barra coloreada encima */}
        <Bar dataKey="valor" stackId="s" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
