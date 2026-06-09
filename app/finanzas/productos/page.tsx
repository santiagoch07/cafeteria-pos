"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { formatMXN } from "@/lib/format";
import Spinner from "@/components/ui/Spinner";
import type { ProductoRanking } from "@/lib/types";

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const AÑO_ACTUAL = new Date().getFullYear();
const AÑOS = Array.from({ length: AÑO_ACTUAL - 2024 + 1 }, (_, i) => 2024 + i);

type SortKey = "unidades_vendidas" | "margen_porcentaje" | "ganancia_total" | "ingreso_total";

function SortIcon({ col, sortBy, sortAsc }: { col: SortKey; sortBy: SortKey; sortAsc: boolean }) {
  if (col !== sortBy) return <ArrowUpDown size={11} className="inline ml-1 opacity-40" />;
  return sortAsc
    ? <ArrowUp size={11} className="inline ml-1 text-accent" />
    : <ArrowDown size={11} className="inline ml-1 text-accent" />;
}

export default function ProductosRentabilidadPage() {
  const ahora = new Date();
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [año, setAño] = useState(ahora.getFullYear());
  const [productos, setProductos] = useState<ProductoRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("ganancia_total");
  const [sortAsc, setSortAsc] = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    fetch(`/api/finanzas/productos?mes=${mes}&anio=${año}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProductos(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [mes, año]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleSort = (col: SortKey) => {
    if (sortBy === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(col);
      setSortAsc(false);
    }
  };

  const sorted = [...productos].sort((a, b) => {
    const aVal = a[sortBy] as number;
    const bVal = b[sortBy] as number;
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  // Insight calculations
  const hero = productos[0];
  const masVendido = [...productos].sort((a, b) => b.unidades_vendidas - a.unidades_vendidas)[0];
  const insightDesalineado = hero && masVendido && masVendido.producto_id !== hero.producto_id;

  const nombreMes = MESES[mes - 1];

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5 pb-16">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-text-strong">Rentabilidad por producto</h1>
            <p className="text-sm text-muted mt-0.5">
              {nombreMes} {año} · Qué productos te dan más utilidad
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
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
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : productos.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center space-y-2">
            <p className="text-lg text-muted">Sin ventas registradas en este periodo</p>
            <p className="text-sm text-muted">
              Captura ventas en{" "}
              <Link href="/pos" className="text-accent hover:underline">/pos</Link>{" "}
              para ver tu ranking de productos.
            </p>
          </div>
        ) : (
          <>
            {/* ── Banner de insight ── */}
            {hero && (
              <div className="bg-accent/10 border border-accent/30 rounded-xl p-5">
                {insightDesalineado ? (
                  <p className="text-base font-medium text-text-strong leading-relaxed">
                    💡 <span className="font-semibold">Insight:</span> Vendes mucho{" "}
                    <span className="text-accent">{masVendido.nombre}</span> pero quien más
                    utilidad te deja es <span className="text-accent">{hero.nombre}</span>.
                    Si pudieras vender 1 {hero.nombre} adicional por día, ganarías{" "}
                    <span className="text-accent font-semibold">
                      {formatMXN(hero.margen_unitario * 30)}
                    </span>{" "}
                    más al mes.
                  </p>
                ) : (
                  <p className="text-base font-medium text-text-strong">
                    🎯 Tu producto estrella{" "}
                    <span className="text-accent">{hero.nombre}</span> es también el que
                    más utilidad te genera. Mantén el foco en él.
                  </p>
                )}
              </div>
            )}

            {/* ── Tabla ── */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs text-muted font-medium">
                        Producto
                      </th>
                      <th
                        className="text-right px-4 py-3 text-xs text-muted font-medium cursor-pointer select-none hover:text-text transition-colors"
                        onClick={() => handleSort("unidades_vendidas")}
                      >
                        Vendidos <SortIcon col="unidades_vendidas" sortBy={sortBy} sortAsc={sortAsc} />
                      </th>
                      <th className="text-right px-4 py-3 text-xs text-muted font-medium">
                        Precio
                      </th>
                      <th className="text-right px-4 py-3 text-xs text-muted font-medium">
                        Costo
                      </th>
                      <th
                        className="text-right px-4 py-3 text-xs text-muted font-medium cursor-pointer select-none hover:text-text transition-colors"
                        onClick={() => handleSort("margen_porcentaje")}
                      >
                        Margen % <SortIcon col="margen_porcentaje" sortBy={sortBy} sortAsc={sortAsc} />
                      </th>
                      <th
                        className="text-right px-4 py-3 text-xs text-muted font-medium cursor-pointer select-none hover:text-text transition-colors"
                        onClick={() => handleSort("ganancia_total")}
                      >
                        Ganancia total <SortIcon col="ganancia_total" sortBy={sortBy} sortAsc={sortAsc} />
                      </th>
                      <th className="px-4 py-3 text-xs text-muted font-medium w-28 text-right">
                        Participación
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((p) => (
                      <tr
                        key={p.producto_id}
                        className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
                      >
                        {/* Producto */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-text">{p.nombre}</span>
                            {p.costo_no_capturado && (
                              <span
                                title="Costo no capturado — captúralo en /admin/productos para ver tu margen real"
                                className="shrink-0"
                              >
                                <AlertCircle size={13} className="text-orange-400" />
                              </span>
                            )}
                          </div>
                          {p.categoria_nombre && (
                            <p className="text-xs text-muted mt-0.5">{p.categoria_nombre}</p>
                          )}
                        </td>
                        {/* Vendidos */}
                        <td className="px-4 py-3 text-right text-text tabular-nums">
                          {p.unidades_vendidas}
                        </td>
                        {/* Precio */}
                        <td className="px-4 py-3 text-right text-muted tabular-nums">
                          {formatMXN(p.precio)}
                        </td>
                        {/* Costo */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          {p.costo_no_capturado ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <span className="text-muted">{formatMXN(p.costo)}</span>
                          )}
                        </td>
                        {/* Margen % */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          {p.costo_no_capturado ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <span
                              className={`font-medium ${
                                p.margen_porcentaje >= 50
                                  ? "text-success"
                                  : p.margen_porcentaje >= 25
                                  ? "text-accent"
                                  : "text-muted"
                              }`}
                            >
                              {p.margen_porcentaje}%
                            </span>
                          )}
                        </td>
                        {/* Ganancia total */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className="text-base font-semibold text-text-strong">
                            {formatMXN(p.ganancia_total)}
                          </span>
                        </td>
                        {/* Participación */}
                        <td className="px-4 py-3">
                          <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all"
                              style={{ width: `${p.participacion_ganancia}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted mt-1 text-right">
                            {p.participacion_ganancia}%
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
