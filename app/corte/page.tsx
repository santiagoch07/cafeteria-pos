"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CalendarDays } from "lucide-react";
import { formatMXN, formatFechaEspanol, formatHora } from "@/lib/format";
import StatCard from "@/components/ui/StatCard";
import Spinner from "@/components/ui/Spinner";

const VentasPorHoraChart = dynamic(() => import("@/components/VentasPorHoraChart"), { ssr: false });

type KPIs = { ventas_totales: number; num_tickets: number; ticket_promedio: number; propinas: number };
type Comparativos = { vs_ayer: number | null; vs_semana_pasada: number | null };
type MetodosPago = { efectivo: number; tarjeta: number };
type ProductoRow = { producto_id: string; nombre: string; cantidad: number; total: number };
type HoraRow = { hora: number; total: number };
type TurnoRow = {
  id: string; fecha_apertura: string; fecha_cierre: string | null;
  efectivo_final_real: number | null; diferencia: number | null;
  estado: string; total_vendido: number;
};
type ReporteData = {
  fecha: string;
  kpis: KPIs;
  comparativos: Comparativos;
  metodos_pago: MetodosPago;
  top_productos: ProductoRow[];
  ventas_por_hora: HoraRow[];
  turnos: TurnoRow[];
};

function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CortePage() {
  const [fecha, setFecha] = useState(hoy());
  const [data, setData]   = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reportes/dia?fecha=${fecha}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [fecha]);

  const efectivoTotal = data?.metodos_pago.efectivo ?? 0;
  const tarjetaTotal  = data?.metodos_pago.tarjeta ?? 0;
  const totalMetodo   = efectivoTotal + tarjetaTotal;
  const efectivoPct   = totalMetodo > 0 ? Math.round((efectivoTotal / totalMetodo) * 100) : 0;
  const tarjetaPct    = 100 - efectivoPct;
  const topMax        = data?.top_productos[0]?.total ?? 1;

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-text-strong capitalize">
              {data ? formatFechaEspanol(data.fecha) : "Cargando…"}
            </h1>
            <p className="text-sm text-muted mt-0.5">Resumen del día</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer border border-border rounded-lg px-3 h-10 text-sm text-muted hover:border-border-hi transition-colors">
            <CalendarDays size={16} />
            <input
              type="date"
              value={fecha}
              max={hoy()}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-transparent text-muted text-sm focus:outline-none cursor-pointer"
            />
          </label>
        </div>

        {loading && <div className="flex justify-center py-20"><Spinner size={28} /></div>}

        {!loading && data && (
          <>
            {/* KPIs 2×2 */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Ventas del día"
                value={formatMXN(data.kpis.ventas_totales)}
                hero
                ayerPct={data.comparativos.vs_ayer}
                semanaPct={data.comparativos.vs_semana_pasada}
              />
              <StatCard
                label="Tickets"
                value={String(data.kpis.num_tickets)}
              />
              <StatCard label="Ticket promedio" value={formatMXN(data.kpis.ticket_promedio)} />
              <StatCard label="Propinas" value={formatMXN(data.kpis.propinas)} />
            </div>

            {/* Métodos de pago */}
            {(efectivoTotal > 0 || tarjetaTotal > 0) && (
              <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                <p className="text-xs text-muted uppercase tracking-widest">Métodos de pago</p>
                <div className="h-3 rounded-full overflow-hidden flex bg-surface-2">
                  {efectivoPct > 0 && (
                    <div className="h-full bg-text-strong transition-all" style={{ width: `${efectivoPct}%` }} />
                  )}
                  {tarjetaPct > 0 && (
                    <div className="h-full bg-accent transition-all" style={{ width: `${tarjetaPct}%` }} />
                  )}
                </div>
                <div className="flex gap-5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-text-strong shrink-0" />
                    <span className="text-sm text-muted">
                      Efectivo <span className="text-text font-medium">{formatMXN(efectivoTotal)}</span>
                      <span className="text-muted"> ({efectivoPct}%)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-accent shrink-0" />
                    <span className="text-sm text-muted">
                      Tarjeta <span className="text-text font-medium">{formatMXN(tarjetaTotal)}</span>
                      <span className="text-muted"> ({tarjetaPct}%)</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Ventas por hora */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted uppercase tracking-widest mb-4">Ventas por hora</p>
              {data.ventas_por_hora.every((h) => h.total === 0) ? (
                <p className="text-muted text-sm text-center py-8">Sin ventas este día</p>
              ) : (
                <VentasPorHoraChart data={data.ventas_por_hora} />
              )}
            </div>

            {/* Top productos */}
            {data.top_productos.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
                <p className="text-xs text-muted uppercase tracking-widest">Top productos</p>
                <div className="space-y-3">
                  {data.top_productos.map((p, i) => (
                    <div key={p.producto_id} className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${i === 0 ? "bg-accent text-black" : "bg-surface-2 text-muted"}`}>
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm font-medium text-text">{p.nombre}</span>
                        <span className="text-sm text-muted shrink-0">{p.cantidad}×</span>
                        <span className="text-sm font-semibold text-text-strong shrink-0 w-20 text-right">{formatMXN(p.total)}</span>
                      </div>
                      <div className="ml-9 h-1 rounded-full bg-surface-2 overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${Math.round((p.total / topMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Turnos del día */}
            {data.turnos.length > 0 && (
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <p className="text-xs text-muted uppercase tracking-widest">Turnos del día</p>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["Apertura", "Cierre", "Estado", "Diferencia"].map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-xs text-muted uppercase tracking-widest font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.turnos.map((t) => {
                      const dif = t.diferencia;
                      return (
                        <tr key={t.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                          <td className="px-4 py-3 text-sm text-text">{formatHora(t.fecha_apertura)}</td>
                          <td className="px-4 py-3 text-sm text-text">{t.fecha_cierre ? formatHora(t.fecha_cierre) : "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${t.estado === "abierto" ? "bg-success/20 text-success" : "bg-surface-2 text-muted"}`}>
                              {t.estado === "abierto" ? "Abierto" : "Cerrado"}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-sm font-semibold ${dif === null ? "text-muted" : dif > 0 ? "text-success" : dif < 0 ? "text-error" : "text-muted"}`}>
                            {dif === null ? "—" : dif === 0 ? "Cuadró" : dif > 0 ? `+${formatMXN(dif)}` : `-${formatMXN(Math.abs(dif))}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sin datos */}
            {data.kpis.num_tickets === 0 && data.turnos.length === 0 && (
              <div className="text-center py-16 text-muted space-y-2">
                <p className="text-xl">Sin ventas este día</p>
                {fecha === hoy() && <p className="text-sm">Las ventas de hoy aparecerán aquí en tiempo real.</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
