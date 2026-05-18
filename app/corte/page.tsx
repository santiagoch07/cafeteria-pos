"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { formatMXN, formatFechaEspanol, formatHora } from "@/lib/format";

const VentasPorHoraChart = dynamic(
  () => import("@/components/VentasPorHoraChart"),
  { ssr: false }
);

type KPIs = {
  total: number;
  tickets: number;
  ticket_promedio: number;
  propinas: number;
};

type Comparativo = {
  total_pct: number | null;
  tickets_pct: number | null;
};

type MetodoRow = {
  metodo_pago: string;
  tickets: number;
  total: number;
  propinas: number;
};

type ProductoRow = {
  nombre: string;
  cantidad: number;
  total: number;
};

type HoraRow = { hora: string; tickets: number; total: number };

type TurnoRow = {
  id: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
  efectivo_inicial: number;
  efectivo_final_sistema: number | null;
  efectivo_final_real: number | null;
  diferencia: number | null;
  notas: string | null;
  estado: string;
};

type ReporteData = {
  fecha: string;
  fecha_display: string;
  kpis: KPIs;
  comparativo_ayer: Comparativo;
  comparativo_semana: Comparativo;
  por_metodo: MetodoRow[];
  top_productos: ProductoRow[];
  ventas_por_hora: HoraRow[];
  turnos_dia: TurnoRow[];
};

function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function PctBadge({ pct, label }: { pct: number | null; label: string }) {
  if (pct === null) return <span className="text-gray-400 text-xs">{label}: —</span>;
  const color = pct > 0 ? "text-green-600" : pct < 0 ? "text-red-500" : "text-gray-500";
  const sign = pct > 0 ? "+" : "";
  return (
    <span className={`text-xs ${color}`}>
      {label}: {sign}{pct}%
    </span>
  );
}

export default function CortePage() {
  const [fecha, setFecha] = useState(hoy());
  const [data, setData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reportes/dia?fecha=${fecha}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [fecha]);

  const totalPorMetodo = data?.por_metodo.reduce((s, r) => s + r.total, 0) ?? 0;

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 pb-16">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 capitalize">
              {data ? data.fecha_display : "Cargando…"}
            </h1>
            <p className="text-sm text-gray-400">Resumen del día</p>
          </div>
          <input
            type="date"
            value={fecha}
            max={hoy()}
            onChange={(e) => setFecha(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {loading && (
          <div className="text-center py-20 text-gray-400">Cargando reporte…</div>
        )}

        {!loading && data && (
          <>
            {/* KPIs 2×2 */}
            <div className="grid grid-cols-2 gap-4">
              <KpiCard
                label="Ventas del día"
                value={formatMXN(data.kpis.total)}
                ayerPct={data.comparativo_ayer.total_pct}
                semanaPct={data.comparativo_semana.total_pct}
                big
              />
              <KpiCard
                label="Tickets"
                value={String(data.kpis.tickets)}
                ayerPct={data.comparativo_ayer.tickets_pct}
                semanaPct={data.comparativo_semana.tickets_pct}
              />
              <KpiCard
                label="Ticket promedio"
                value={formatMXN(data.kpis.ticket_promedio)}
              />
              <KpiCard
                label="Propinas"
                value={formatMXN(data.kpis.propinas)}
              />
            </div>

            {/* Métodos de pago */}
            {data.por_metodo.length > 0 && (
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="font-semibold text-gray-700 mb-4">Métodos de pago</h2>
                <div className="space-y-3">
                  {data.por_metodo.map((m) => {
                    const pct = totalPorMetodo > 0
                      ? Math.round((m.total / totalPorMetodo) * 100)
                      : 0;
                    const isEfectivo = m.metodo_pago === "efectivo";
                    return (
                      <div key={m.metodo_pago}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 flex items-center gap-1">
                            {isEfectivo ? "💵" : "💳"}{" "}
                            {isEfectivo ? "Efectivo" : "Tarjeta"}
                            <span className="text-gray-400 font-normal ml-1">
                              ({m.tickets} tickets)
                            </span>
                          </span>
                          <span className="font-bold text-gray-800">{formatMXN(m.total)}</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isEfectivo ? "bg-blue-400" : "bg-purple-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{pct}% del total</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ventas por hora */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="font-semibold text-gray-700 mb-4">Ventas por hora</h2>
              {data.ventas_por_hora.every((h) => h.total === 0) ? (
                <p className="text-gray-400 text-sm text-center py-8">Sin ventas registradas</p>
              ) : (
                <VentasPorHoraChart data={data.ventas_por_hora} formatMXN={formatMXN} />
              )}
            </div>

            {/* Top 5 productos */}
            {data.top_productos.length > 0 && (
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="font-semibold text-gray-700 mb-3">Top productos</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 text-xs uppercase border-b">
                      <th className="pb-2 text-left font-medium">#</th>
                      <th className="pb-2 text-left font-medium">Producto</th>
                      <th className="pb-2 text-right font-medium">Pzas</th>
                      <th className="pb-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_productos.map((p, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 text-gray-400 font-medium w-6">{i + 1}</td>
                        <td className="py-2 font-medium text-gray-800">{p.nombre}</td>
                        <td className="py-2 text-right text-gray-600">{p.cantidad}</td>
                        <td className="py-2 text-right font-bold text-gray-800">
                          {formatMXN(p.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Turnos del día */}
            {data.turnos_dia.length > 0 && (
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="font-semibold text-gray-700 mb-3">Turnos del día</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 text-xs uppercase border-b">
                        <th className="pb-2 text-left font-medium">Apertura</th>
                        <th className="pb-2 text-left font-medium">Cierre</th>
                        <th className="pb-2 text-right font-medium">Estado</th>
                        <th className="pb-2 text-right font-medium">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.turnos_dia.map((t) => {
                        const dif = t.diferencia;
                        const difColor =
                          dif === null
                            ? "text-gray-400"
                            : dif > 0
                            ? "text-green-600"
                            : dif < 0
                            ? "text-red-500"
                            : "text-gray-500";
                        return (
                          <tr key={t.id} className="border-b last:border-0">
                            <td className="py-2 text-gray-700">
                              {formatHora(t.fecha_apertura)}
                            </td>
                            <td className="py-2 text-gray-700">
                              {t.fecha_cierre ? formatHora(t.fecha_cierre) : "—"}
                            </td>
                            <td className="py-2 text-right">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  t.estado === "abierto"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {t.estado === "abierto" ? "Abierto" : "Cerrado"}
                              </span>
                            </td>
                            <td className={`py-2 text-right font-bold ${difColor}`}>
                              {dif === null
                                ? "—"
                                : dif === 0
                                ? "Cuadró"
                                : dif > 0
                                ? `+${formatMXN(dif)}`
                                : `-${formatMXN(Math.abs(dif))}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sin datos */}
            {data.kpis.tickets === 0 && data.turnos_dia.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <p className="text-xl">Sin ventas este día</p>
                <p className="text-sm mt-1">
                  {fecha === hoy()
                    ? "Las ventas de hoy aparecerán aquí en tiempo real"
                    : formatFechaEspanol(fecha)}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  ayerPct,
  semanaPct,
  big,
}: {
  label: string;
  value: string;
  ayerPct?: number | null;
  semanaPct?: number | null;
  big?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`font-bold text-gray-800 mt-1 ${big ? "text-3xl" : "text-2xl"}`}>
        {value}
      </p>
      {(ayerPct !== undefined || semanaPct !== undefined) && (
        <div className="flex flex-col gap-0.5 mt-2">
          {ayerPct !== undefined && (
            <PctBadge pct={ayerPct ?? null} label="vs ayer" />
          )}
          {semanaPct !== undefined && (
            <PctBadge pct={semanaPct ?? null} label="vs sem. ant." />
          )}
        </div>
      )}
    </div>
  );
}
