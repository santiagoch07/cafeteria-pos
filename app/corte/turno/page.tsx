"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMXN, formatHora } from "@/lib/format";

type Turno = {
  id: number;
  fecha_apertura: string;
  efectivo_inicial: number;
  estado: string;
};

type Resumen = {
  tickets: number;
  total_efectivo: number;
  total_tarjeta: number;
  propinas: number;
  propinas_efectivo: number;
  efectivo_esperado: number;
};

type CierreResult = {
  diferencia: number;
  efectivo_final_sistema: number;
  efectivo_final_real: number;
};

export default function CorteTurnoPage() {
  const router = useRouter();

  const [turno, setTurno] = useState<Turno | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [efectivoReal, setEfectivoReal] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<CierreResult | null>(null);

  useEffect(() => {
    async function cargar() {
      const res = await fetch("/api/turnos/abierto");
      const t: Turno | null = await res.json();
      setTurno(t);

      if (t) {
        // Calcular resumen del turno desde las órdenes
        const resOrden = await fetch(
          `/api/turnos/${t.id}/resumen`
        );
        if (resOrden.ok) {
          setResumen(await resOrden.json());
        }
      }
      setLoading(false);
    }
    cargar();
  }, []);

  // Calcular duración del turno
  function duracion(apertura: string): string {
    const inicio = new Date(apertura.replace(" ", "T"));
    const ahora = new Date();
    const mins = Math.floor((ahora.getTime() - inicio.getTime()) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  async function handleCerrar(e: React.FormEvent) {
    e.preventDefault();
    if (!turno) return;
    setGuardando(true);

    const res = await fetch(`/api/turnos/${turno.id}/cerrar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        efectivo_real_pesos: parseFloat(efectivoReal) || 0,
        notas: notas.trim() || null,
      }),
    });

    if (res.ok) {
      const t = await res.json();
      setResultado({
        diferencia: t.diferencia,
        efectivo_final_sistema: t.efectivo_final_sistema,
        efectivo_final_real: t.efectivo_final_real,
      });
    } else {
      alert("Error al cerrar el turno");
    }
    setGuardando(false);
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-400">Cargando turno…</p>
      </div>
    );
  }

  if (!turno) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 text-lg">No hay un turno abierto</p>
        <a
          href="/pos"
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 rounded-xl min-h-[60px] flex items-center transition-colors"
        >
          Ir a la caja
        </a>
      </div>
    );
  }

  // ── Pantalla de confirmación post-cierre ──
  if (resultado) {
    const dif = resultado.diferencia;
    const color =
      dif > 0 ? "text-green-600" : dif < 0 ? "text-red-600" : "text-gray-500";
    const icono = dif > 0 ? "📈" : dif < 0 ? "📉" : "✅";
    const texto =
      dif > 0
        ? `Sobrante de ${formatMXN(dif)}`
        : dif < 0
        ? `Faltante de ${formatMXN(Math.abs(dif))}`
        : "Cuadró exacto";

    return (
      <div className="h-full overflow-y-auto flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center space-y-4">
          <div className="text-6xl">{icono}</div>
          <h2 className="text-2xl font-bold text-gray-800">Turno cerrado</h2>
          <div className={`text-3xl font-bold ${color}`}>{texto}</div>
          <div className="text-sm text-gray-500 space-y-1 pt-2 text-left bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between">
              <span>Esperado en caja</span>
              <span className="font-semibold">{formatMXN(resultado.efectivo_final_sistema)}</span>
            </div>
            <div className="flex justify-between">
              <span>Contado en caja</span>
              <span className="font-semibold">{formatMXN(resultado.efectivo_final_real)}</span>
            </div>
          </div>
          <button
            onClick={() => router.push("/pos")}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg rounded-xl min-h-[60px] transition-colors"
          >
            Nuevo turno
          </button>
        </div>
      </div>
    );
  }

  // ── Formulario de cierre ──
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cierre de turno</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Turno abierto a las {formatHora(turno.fecha_apertura)} ·{" "}
            {duracion(turno.fecha_apertura)} de duración
          </p>
        </div>

        {/* Resumen de ventas */}
        {resumen && (
          <div className="bg-white rounded-xl shadow divide-y">
            <div className="px-5 py-4">
              <h2 className="font-semibold text-gray-700 mb-3">Resumen del turno</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Ventas totales</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {formatMXN(resumen.total_efectivo + resumen.total_tarjeta)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{resumen.tickets} ticket{resumen.tickets !== 1 ? "s" : ""}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Propinas</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {formatMXN(resumen.propinas)}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Desglose por método</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💵</span>
                    <span className="text-sm font-medium text-gray-700">Efectivo</span>
                  </div>
                  <span className="font-bold text-gray-800">{formatMXN(resumen.total_efectivo)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💳</span>
                    <span className="text-sm font-medium text-gray-700">Tarjeta</span>
                  </div>
                  <span className="font-bold text-gray-800">{formatMXN(resumen.total_tarjeta)}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 bg-amber-50 rounded-b-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-800">Efectivo esperado en caja</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Inicial {formatMXN(turno.efectivo_inicial)} + efectivo {formatMXN(resumen.total_efectivo)}
                  </p>
                </div>
                <span className="text-2xl font-bold text-amber-700">
                  {formatMXN(resumen.efectivo_esperado)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleCerrar} className="bg-white rounded-xl shadow p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Conteo de caja</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Efectivo real contado (pesos) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={efectivoReal}
              onChange={(e) => setEfectivoReal(e.target.value)}
              className="w-full border rounded-xl px-4 py-4 text-3xl font-bold text-center text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="0.00"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas del turno <span className="text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="w-full border rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              placeholder="Ej. Se cayó el sistema 10 min, faltó cambio a las 2pm…"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push("/pos")}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold rounded-xl min-h-[60px] hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !efectivoReal}
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl min-h-[60px] transition-colors"
            >
              {guardando ? "Cerrando…" : "Cerrar turno"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
