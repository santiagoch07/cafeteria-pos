"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  TrendingUp, CheckCircle2, AlertTriangle, AlertOctagon,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { formatMXN } from "@/lib/format";
import Spinner from "@/components/ui/Spinner";

const WaterfallChart = dynamic(() => import("@/components/WaterfallChart"), { ssr: false });
const PEChart = dynamic(() => import("@/components/PEChart"), { ssr: false });

// ── Tipos ────────────────────────────────────────────────────
type Estado = "excelente" | "bueno" | "precaucion" | "critico";

type DashData = {
  periodo: { mes: number; año: number; nombre_mes: string };
  kpis: {
    ventas_totales: number;
    costo_variable: number;
    margen_contribucion: number;
    gastos_fijos: number;
    utilidad_neta: number;
    margen_porcentaje: number;
  };
  punto_equilibrio: {
    monto_necesario: number;
    ya_alcanzado: boolean;
    dias_para_alcanzar: number | null;
    falta_por_vender: number;
  };
  ventas_acumuladas_por_dia: { dia: number; ventas_acumuladas: number; punto_equilibrio_linea: number }[];
  comparativo_mes_anterior: { utilidad_neta_anterior: number | null; cambio_porcentaje: number | null };
  gastos_por_categoria: { tipo_nombre: string; monto: number; porcentaje: number }[];
  evaluacion: { estado: Estado; mensaje: string };
};

// ── Constantes de UI ─────────────────────────────────────────
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const AÑO_ACTUAL = new Date().getFullYear();
const AÑOS = Array.from({ length: AÑO_ACTUAL - 2024 + 1 }, (_, i) => 2024 + i);

const ESTADO_CONFIG: Record<Estado, { bg: string; border: string; icon: React.ElementType; label: string }> = {
  excelente: { bg: "bg-success/10",   border: "border-success/30",  icon: TrendingUp,    label: "EXCELENTE" },
  bueno:     { bg: "bg-accent/10",    border: "border-accent/30",   icon: CheckCircle2,  label: "BUEN MES" },
  precaucion:{ bg: "bg-orange-500/10",border: "border-orange-500/30",icon: AlertTriangle, label: "PRECAUCIÓN" },
  critico:   { bg: "bg-error/10",     border: "border-error/30",    icon: AlertOctagon,  label: "CRÍTICO" },
};

const ESTADO_ICON_COLOR: Record<Estado, string> = {
  excelente: "text-success", bueno: "text-accent", precaucion: "text-orange-400", critico: "text-error",
};

// ── Helpers de UI ────────────────────────────────────────────
function KPICard({ label, value, sub, hero }: { label: string; value: string; sub?: string; hero?: boolean }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-1.5">
      <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
      <p className={`font-semibold leading-none ${hero ? "text-5xl text-accent" : "text-4xl text-text-strong"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function PctChange({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-muted">Sin datos</span>;
  if (pct === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-muted"><Minus size={12} /> Sin cambio</span>;
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-success" : "text-error"}`}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {up ? "+" : ""}{pct}%
    </span>
  );
}

// ── Página ───────────────────────────────────────────────────
export default function FinanzasDashboard() {
  const ahora = new Date();
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [año, setAño] = useState(ahora.getFullYear());
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(() => {
    setLoading(true);
    fetch(`/api/finanzas/dashboard?mes=${mes}&anio=${año}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [mes, año]);

  useEffect(() => { cargar(); }, [cargar]);

  // Datos derivados
  const k = data?.kpis;
  const pe = data?.punto_equilibrio;
  const evaluacion = data?.evaluacion;
  const comp = data?.comparativo_mes_anterior;
  const sinVentas = k ? k.ventas_totales === 0 : true;
  const sinGastos = k ? k.gastos_fijos === 0 : true;
  const sinCostos = k ? k.costo_variable === 0 && k.ventas_totales > 0 : false;

  // Datos para el gráfico waterfall
  const waterfallData = k ? [
    { name: "Ventas",             base: 0,                                      valor: k.ventas_totales,                  color: "#22c55e" },
    { name: "Costo\nproductos",   base: k.margen_contribucion,                  valor: k.costo_variable,                  color: "#ef4444" },
    { name: "Gastos\nfijos",      base: Math.max(0, k.utilidad_neta),           valor: k.gastos_fijos,                    color: "#f97316" },
    { name: "Utilidad\nneta",     base: 0,                                      valor: Math.max(0, k.utilidad_neta),      color: "#FFD944" },
  ] : [];

  const topGasto = data?.gastos_por_categoria[0]?.monto ?? 1;

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5 pb-16">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-text-strong">Salud financiera</h1>
            <p className="text-sm text-muted mt-0.5">
              {data?.periodo.nombre_mes ?? "Cargando…"} · Cómo va tu negocio este mes
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex gap-2">
              <select
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value))}
                className="h-9 rounded-lg border border-border bg-bg px-3 text-sm text-text focus:border-accent focus:outline-none"
              >
                {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
              <select
                value={año}
                onChange={(e) => setAño(parseInt(e.target.value))}
                className="h-9 rounded-lg border border-border bg-bg px-3 text-sm text-text focus:border-accent focus:outline-none"
              >
                {AÑOS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <Link href="/finanzas/gastos" className="text-sm text-muted hover:text-accent transition-colors whitespace-nowrap">
              Capturar gastos →
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : !data ? (
          <p className="text-muted text-center py-20">Error al cargar datos.</p>
        ) : (
          <>
            {/* ── Banner evaluación ── */}
            {evaluacion && (() => {
              const cfg = ESTADO_CONFIG[evaluacion.estado];
              const IconEl = cfg.icon;
              return (
                <div className={`rounded-xl border p-5 flex items-start gap-4 ${cfg.bg} ${cfg.border}`}>
                  <IconEl size={28} className={`shrink-0 mt-0.5 ${ESTADO_ICON_COLOR[evaluacion.estado]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold tracking-widest text-muted">{cfg.label}</p>
                    <p className="text-base font-medium text-text-strong mt-0.5">{evaluacion.mensaje}</p>
                  </div>
                  {comp && (
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-muted">Mes anterior</p>
                      {comp.utilidad_neta_anterior !== null ? (
                        <>
                          <p className="text-sm font-medium text-text">{formatMXN(comp.utilidad_neta_anterior)}</p>
                          <PctChange pct={comp.cambio_porcentaje} />
                        </>
                      ) : (
                        <p className="text-xs text-muted">Sin datos</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Aviso sin gastos */}
            {sinGastos && !sinVentas && (
              <div className="bg-surface-2 border-l-4 border-orange-400 rounded-r-xl px-4 py-3">
                <p className="text-sm text-muted">
                  ⚠️ No has capturado gastos este mes. Tu utilidad mostrada es solo el margen de contribución.{" "}
                  <Link href="/finanzas/gastos" className="text-accent hover:underline">Capturar gastos →</Link>
                </p>
              </div>
            )}

            {/* Aviso sin costos de productos */}
            {sinCostos && (
              <div className="bg-surface-2 border-l-4 border-border rounded-r-xl px-4 py-3">
                <p className="text-sm text-muted">
                  ℹ️ Algunos productos no tienen costo capturado. La rentabilidad puede ser menor que la mostrada.
                </p>
              </div>
            )}

            {/* ── KPIs 2×2 ── */}
            <div className="grid grid-cols-2 gap-3">
              <KPICard
                label="Vendiste"
                value={formatMXN(k!.ventas_totales)}
              />
              <KPICard
                label="Costo de productos"
                value={formatMXN(k!.costo_variable)}
                sub={k!.ventas_totales > 0
                  ? `${Math.round(k!.costo_variable / k!.ventas_totales * 100)}% de ventas`
                  : undefined}
              />
              <KPICard
                label="Gastos fijos"
                value={formatMXN(k!.gastos_fijos)}
              />
              <KPICard
                label="Utilidad neta"
                value={formatMXN(k!.utilidad_neta)}
                sub={k!.ventas_totales > 0 ? `margen ${k!.margen_porcentaje}%` : undefined}
                hero
              />
            </div>

            {/* Aviso sin ventas */}
            {sinVentas && (
              <div className="bg-surface border border-border rounded-xl p-8 text-center space-y-2">
                <p className="text-lg text-muted">Sin ventas en este periodo</p>
                <p className="text-sm text-muted">
                  Captura ventas en{" "}
                  <Link href="/pos" className="text-accent hover:underline">/pos</Link>{" "}
                  para ver tu rentabilidad aquí.
                </p>
              </div>
            )}

            {/* ── Estado de resultados (waterfall) ── */}
            {!sinVentas && (
              <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                <div>
                  <p className="text-xs text-muted uppercase tracking-widest">Estado de resultados</p>
                  <p className="text-sm text-muted mt-0.5">Cómo se descompone tu dinero este mes</p>
                </div>
                {/* Leyenda */}
                <div className="flex gap-4 flex-wrap text-xs text-muted">
                  {[
                    { color: "#22c55e", label: "Ventas" },
                    { color: "#ef4444", label: "Costo productos" },
                    { color: "#f97316", label: "Gastos fijos" },
                    { color: "#FFD944", label: "Utilidad neta" },
                  ].map(({ color, label }) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                      {label}
                    </span>
                  ))}
                </div>
                <WaterfallChart data={waterfallData} />
              </div>
            )}

            {/* ── Punto de equilibrio ── */}
            {!sinVentas && pe && (
              <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                <div>
                  <p className="text-xs text-muted uppercase tracking-widest">Punto de equilibrio</p>
                  <p className="text-sm text-muted mt-0.5">Cuánto necesitas vender para no perder dinero</p>
                </div>

                {/* Estado del PE */}
                {pe.monto_necesario > 0 && (
                  pe.ya_alcanzado ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-base font-medium text-success">
                        ✅ Ya superaste el punto de equilibrio
                      </span>
                      {pe.dias_para_alcanzar && (
                        <span className="text-sm text-muted">Lo cruzaste el día {pe.dias_para_alcanzar}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-base font-medium text-accent">
                      🎯 Te faltan {formatMXN(pe.falta_por_vender)} para llegar al punto de equilibrio
                    </p>
                  )
                )}

                <p className="text-xs text-muted">
                  Necesitas vender <span className="text-text font-medium">{formatMXN(pe.monto_necesario)}</span> mensuales
                  para cubrir tus gastos fijos y costos variables.
                </p>

                <PEChart data={data!.ventas_acumuladas_por_dia} />

                {/* Leyenda de la gráfica */}
                <div className="flex gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-0.5 bg-accent inline-block" />
                    Ventas acumuladas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-0.5 bg-[#6B7280] inline-block" style={{ backgroundImage: "repeating-linear-gradient(90deg,#6B7280 0,#6B7280 4px,transparent 4px,transparent 8px)" }} />
                    Punto de equilibrio
                  </span>
                </div>
              </div>
            )}

            {/* ── Desglose de gastos ── */}
            {data.gastos_por_categoria.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                <p className="text-xs text-muted uppercase tracking-widest">Gastos por categoría</p>
                <div className="space-y-3">
                  {data.gastos_por_categoria.map((g) => (
                    <div key={g.tipo_nombre} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text truncate flex-1 pr-4">{g.tipo_nombre}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-medium text-text-strong">{formatMXN(g.monto)}</span>
                          <span className="text-muted w-8 text-right">{g.porcentaje}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${Math.round(g.monto / topGasto * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
