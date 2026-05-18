"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type HoraRow = { hora: string; tickets: number; total: number };

type Props = {
  data: HoraRow[];
  formatMXN: (c: number) => string;
};

function TooltipContent({
  active,
  payload,
  label,
  formatMXN,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  formatMXN: (c: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700">{label}:00 hrs</p>
      <p className="text-amber-600 font-bold">{formatMXN(payload[0].value)}</p>
    </div>
  );
}

export default function VentasPorHoraChart({ data, formatMXN }: Props) {
  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="hora"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis hide />
        <Tooltip content={<TooltipContent formatMXN={formatMXN} />} />
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.total === maxTotal ? "#f59e0b" : "#fcd34d"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
