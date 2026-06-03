"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { formatMXN } from "@/lib/format";

type PERow = { dia: number; ventas_acumuladas: number; punto_equilibrio_linea: number };

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border-hi rounded-lg px-3 py-2 text-sm space-y-1">
      <p className="font-medium text-muted">Día {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name === "ventas_acumuladas" ? "Ventas" : "PE"}: {formatMXN(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function PEChart({ data }: { data: PERow[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="dia"
          tick={{ fontSize: 11, fill: "#A3A3A3" }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          hide
          domain={[0, (dataMax: number) => Math.max(dataMax, data[0]?.punto_equilibrio_linea ?? 0) * 1.1]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          dataKey="ventas_acumuladas"
          fill="rgba(255,217,68,0.12)"
          stroke="#FFD944"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: "#FFD944" }}
        />
        <Line
          dataKey="punto_equilibrio_linea"
          stroke="#6B7280"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
