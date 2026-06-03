"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ShoppingBag, Banknote, CreditCard } from "lucide-react";
import { formatMXN, formatHora } from "@/lib/format";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Textarea from "@/components/ui/Textarea";

type Turno = { id: string; fecha_apertura: string; efectivo_inicial: number; estado: string };
type Resumen = { tickets: number; total_efectivo: number; total_tarjeta: number; propinas: number; efectivo_esperado: number };
type CierreResult = { diferencia: number; efectivo_final_sistema: number; efectivo_final_real: number };

function duracion(apertura: string): string {
  const mins = Math.floor((Date.now() - new Date(apertura.replace(" ", "T")).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function CorteTurnoPage() {
  const router = useRouter();

  const [turno, setTurno]       = useState<Turno | null>(null);
  const [resumen, setResumen]   = useState<Resumen | null>(null);
  const [loading, setLoading]   = useState(true);
  const [efectivoReal, setEfectivoReal] = useState("");
  const [notas, setNotas]       = useState("");
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<CierreResult | null>(null);

  useEffect(() => {
    async function cargar() {
      const t: Turno | null = await fetch("/api/turnos/abierto", { cache: "no-store" }).then((r) => r.json());
      setTurno(t);
      if (t) {
        const r = await fetch(`/api/turnos/${t.id}/resumen`, { cache: "no-store" });
        if (r.ok) setResumen(await r.json());
      }
      setLoading(false);
    }
    cargar();
  }, []);

  async function handleCerrar(e: React.FormEvent) {
    e.preventDefault();
    if (!turno) return;
    setGuardando(true);
    const res = await fetch(`/api/turnos/${turno.id}/cerrar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ efectivo_real_pesos: parseFloat(efectivoReal) || 0, notas: notas.trim() || null }),
    });
    if (res.ok) {
      const t = await res.json();
      setResultado({ diferencia: t.diferencia, efectivo_final_sistema: t.efectivo_final_sistema, efectivo_final_real: t.efectivo_final_real });
      router.refresh();
    } else {
      alert("Error al cerrar el turno");
    }
    setGuardando(false);
  }

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Spinner size={28} /></div>;
  }

  if (!turno) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-muted text-lg">No hay un turno abierto</p>
        <Button variant="primary" size="lg" onClick={() => router.push("/pos")}>Ir a la caja</Button>
      </div>
    );
  }

  /* ── Confirmación post-cierre ─────────────────────────── */
  if (resultado) {
    const dif = resultado.diferencia;
    const sobra   = dif > 0;
    const falta   = dif < 0;
    const cuadro  = dif === 0;
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="bg-surface border border-border rounded-xl p-8 text-center space-y-3">
            <p className="text-5xl">{sobra ? "📈" : falta ? "📉" : "✅"}</p>
            <h2 className="text-2xl font-semibold text-text-strong">Turno cerrado</h2>
            <p className={`text-3xl font-semibold ${sobra ? "text-success" : falta ? "text-error" : "text-muted"}`}>
              {cuadro ? "Cuadró exacto" : sobra ? `Sobrante de ${formatMXN(dif)}` : `Faltante de ${formatMXN(Math.abs(dif))}`}
            </p>
            <div className="bg-bg rounded-lg p-4 text-sm space-y-2 text-left mt-2">
              <div className="flex justify-between">
                <span className="text-muted">Esperado</span>
                <span className="text-text font-medium">{formatMXN(resultado.efectivo_final_sistema)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Contado</span>
                <span className="text-text font-medium">{formatMXN(resultado.efectivo_final_real)}</span>
              </div>
            </div>
          </div>
          <Button variant="primary" size="xl" className="w-full" onClick={() => router.push("/pos")}>
            Nuevo turno
          </Button>
        </div>
      </div>
    );
  }

  /* ── Formulario de cierre ─────────────────────────────── */
  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-text-strong">Cierre de turno</h1>
          <div className="flex items-center gap-4 mt-1.5 text-sm text-muted">
            <span className="flex items-center gap-1.5"><Clock size={14} /> Apertura: {formatHora(turno.fecha_apertura)}</span>
            <span>{duracion(turno.fecha_apertura)} de duración</span>
          </div>
        </div>

        {/* Resumen del turno */}
        {resumen && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {/* Métricas */}
            <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingBag size={14} className="text-muted" />
                  <p className="text-xs text-muted uppercase tracking-wider">Total vendido</p>
                </div>
                <p className="text-3xl font-semibold text-text-strong">
                  {formatMXN(resumen.total_efectivo + resumen.total_tarjeta)}
                </p>
                <p className="text-xs text-muted mt-1">{resumen.tickets} ticket{resumen.tickets !== 1 ? "s" : ""}</p>
              </div>
              <div className="p-5">
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Propinas</p>
                <p className="text-3xl font-semibold text-text-strong">{formatMXN(resumen.propinas)}</p>
              </div>
            </div>

            {/* Desglose */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs text-muted uppercase tracking-wider">Desglose</p>
              {[
                { label: "Efectivo", icon: Banknote, total: resumen.total_efectivo },
                { label: "Tarjeta",  icon: CreditCard, total: resumen.total_tarjeta },
              ].map(({ label, icon: Icon, total }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted">
                    <Icon size={16} /> {label}
                  </span>
                  <span className="text-sm font-semibold text-text">{formatMXN(total)}</span>
                </div>
              ))}
            </div>

            {/* Efectivo esperado */}
            <div className="px-5 py-4 bg-accent/10 border-t border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-accent">Efectivo esperado en caja</p>
                <p className="text-xs text-muted mt-0.5">
                  Inicial {formatMXN(turno.efectivo_inicial)} + ventas {formatMXN(resumen.total_efectivo)}
                </p>
              </div>
              <p className="text-3xl font-semibold text-text-strong">{formatMXN(resumen.efectivo_esperado)}</p>
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleCerrar} className="bg-surface border border-border rounded-xl p-6 space-y-5">
          <p className="text-sm font-medium text-muted">Conteo de caja</p>

          {/* Input grande de efectivo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted">Efectivo real contado *</label>
            <div className="flex items-center border border-border rounded-lg bg-bg focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 transition-all overflow-hidden h-20">
              <span className="px-5 text-2xl text-muted select-none">$</span>
              <input
                type="number" min="0" step="0.01" required autoFocus
                value={efectivoReal}
                onChange={(e) => setEfectivoReal(e.target.value)}
                className="flex-1 h-full bg-transparent text-3xl font-semibold text-center text-text-strong focus:outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <Textarea
            label="Notas del turno (opcional)"
            rows={3}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej. Se cayó el sistema 10 min, faltó cambio a las 2pm…"
          />

          <div className="flex gap-3">
            <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={() => router.push("/pos")}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" size="lg" className="flex-1" disabled={guardando || !efectivoReal}>
              {guardando ? <Spinner size={16} /> : "Cerrar turno"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
