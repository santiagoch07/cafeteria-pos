"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Home, Users, Zap, Package, Wrench, CreditCard,
  Megaphone, Receipt, MoreHorizontal, Pencil, Trash2,
  type LucideIcon,
} from "lucide-react";
import { formatMXN } from "@/lib/format";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

type TipoGasto = { id: string; nombre: string; orden: number };
type Gasto = {
  id: string;
  mes: number;
  año: number;
  tipo_gasto_id: string;
  monto: number;
  notas: string | null;
  tipo: TipoGasto;
};
type FormEntry = { monto: string; notas: string; saving: boolean; error: string };

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const AÑO_ACTUAL = new Date().getFullYear();
const AÑOS = Array.from({ length: AÑO_ACTUAL - 2024 + 1 }, (_, i) => 2024 + i);

const ICONO_POR_ORDEN: Record<number, LucideIcon> = {
  1: Home, 2: Users, 3: Zap, 4: Package, 5: Wrench,
  6: CreditCard, 7: Megaphone, 8: Receipt, 9: MoreHorizontal,
};

const FORM_VACIO: FormEntry = { monto: "", notas: "", saving: false, error: "" };

export default function GastosPage() {
  const ahora = new Date();
  const [mes, setMes]   = useState(ahora.getMonth() + 1);
  const [año, setAño]   = useState(ahora.getFullYear());
  const [tipos, setTipos]   = useState<TipoGasto[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms]     = useState<Record<string, FormEntry>>({});
  const [editing, setEditing] = useState<Set<string>>(new Set());

  // Tipos: se cargan una sola vez
  useEffect(() => {
    fetch("/api/tipos-gasto", { cache: "no-store" })
      .then((r) => r.json())
      .then(setTipos);
  }, []);

  // Gastos: se recargan al cambiar mes/año
  const cargarGastos = useCallback(() => {
    setLoading(true);
    setForms({});
    setEditing(new Set());
    fetch(`/api/gastos?mes=${mes}&anio=${año}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setGastos(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [mes, año]);

  useEffect(() => { cargarGastos(); }, [cargarGastos]);

  // ── Helpers de formulario ────────────────────────────────
  const gastoByTipo = new Map(gastos.map((g) => [g.tipo_gasto_id, g]));
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
  const esHoy = mes === ahora.getMonth() + 1 && año === ahora.getFullYear();

  function getForm(tipoId: string, gasto?: Gasto): FormEntry {
    return forms[tipoId] ?? {
      monto: gasto ? String(gasto.monto / 100) : "",
      notas: gasto?.notas ?? "",
      saving: false,
      error: "",
    };
  }

  function patchForm(tipoId: string, updates: Partial<FormEntry>, gasto?: Gasto) {
    setForms((prev) => ({
      ...prev,
      [tipoId]: { ...(prev[tipoId] ?? { ...FORM_VACIO, monto: gasto ? String(gasto.monto / 100) : "", notas: gasto?.notas ?? "" }), ...updates },
    }));
  }

  function clearForm(tipoId: string) {
    setForms((prev) => { const n = { ...prev }; delete n[tipoId]; return n; });
  }

  // ── Acciones ────────────────────────────────────────────
  async function guardar(tipo: TipoGasto) {
    const form = getForm(tipo.id);
    if (form.monto === "") return;
    const montoPesos = parseFloat(form.monto);
    if (isNaN(montoPesos) || montoPesos < 0) return;

    patchForm(tipo.id, { saving: true, error: "" });
    const res = await fetch("/api/gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes, año, tipo_gasto_id: tipo.id, monto_pesos: montoPesos, notas: form.notas.trim() || null }),
    });
    const data = await res.json();
    if (!res.ok) { patchForm(tipo.id, { saving: false, error: data.error ?? "Error al guardar" }); return; }
    setGastos((prev) => [...prev, data]);
    clearForm(tipo.id);
  }

  async function actualizar(tipo: TipoGasto, gastoId: string) {
    const gasto = gastoByTipo.get(tipo.id);
    const form = getForm(tipo.id, gasto);
    if (form.monto === "") return;
    const montoPesos = parseFloat(form.monto);
    if (isNaN(montoPesos) || montoPesos < 0) return;

    patchForm(tipo.id, { saving: true, error: "" }, gasto);
    const res = await fetch(`/api/gastos/${gastoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto_pesos: montoPesos, notas: form.notas.trim() || null }),
    });
    const data = await res.json();
    if (!res.ok) { patchForm(tipo.id, { saving: false, error: data.error ?? "Error al actualizar" }, gasto); return; }
    setGastos((prev) => prev.map((g) => g.id === gastoId ? data : g));
    setEditing((prev) => { const n = new Set(prev); n.delete(tipo.id); return n; });
    clearForm(tipo.id);
  }

  function iniciarEdicion(tipo: TipoGasto, gasto: Gasto) {
    setEditing((prev) => new Set(prev).add(tipo.id));
    setForms((prev) => ({
      ...prev,
      [tipo.id]: { monto: String(gasto.monto / 100), notas: gasto.notas ?? "", saving: false, error: "" },
    }));
  }

  function cancelarEdicion(tipoId: string) {
    setEditing((prev) => { const n = new Set(prev); n.delete(tipoId); return n; });
    clearForm(tipoId);
  }

  async function eliminar(gasto: Gasto) {
    if (!confirm("¿Eliminar este gasto?")) return;
    const res = await fetch(`/api/gastos/${gasto.id}`, { method: "DELETE" });
    if (res.ok) setGastos((prev) => prev.filter((g) => g.id !== gasto.id));
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-text-strong">Gastos del mes</h1>
            <p className="text-sm text-muted mt-0.5">
              Captura los gastos fijos y variables para calcular tu rentabilidad
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <select
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value))}
              className="h-9 rounded-lg border border-border bg-bg px-3 text-sm text-text focus:border-accent focus:outline-none"
            >
              {MESES.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={año}
              onChange={(e) => setAño(parseInt(e.target.value))}
              className="h-9 rounded-lg border border-border bg-bg px-3 text-sm text-text focus:border-accent focus:outline-none"
            >
              {AÑOS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <p className="text-xs text-muted uppercase tracking-widest">Total de gastos del mes</p>
          <p className="text-5xl font-semibold text-accent mt-2 leading-none">{formatMXN(totalGastos)}</p>
          <p className="text-sm text-muted mt-2">{gastos.length} de 9 categorías capturadas</p>
        </div>

        {/* Banner empty state */}
        {!loading && esHoy && gastos.length === 0 && (
          <div className="bg-surface-2 border-l-4 border-accent rounded-r-xl px-4 py-3">
            <p className="text-sm text-muted">
              💡 Empieza capturando tu{" "}
              <span className="text-text font-medium">Renta</span> y{" "}
              <span className="text-text font-medium">Nómina</span>, son los gastos más grandes en una cafetería
            </p>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={28} /></div>
        ) : (
          <div className="space-y-3">
            {tipos.map((tipo) => {
              const gasto    = gastoByTipo.get(tipo.id);
              const isEdit   = editing.has(tipo.id);
              const showForm = !gasto || isEdit;
              const form     = getForm(tipo.id, gasto);
              const Icono    = ICONO_POR_ORDEN[tipo.orden] ?? MoreHorizontal;

              return (
                <div key={tipo.id} className="bg-surface border border-border rounded-xl p-5 space-y-3">
                  {/* Encabezado de la card */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
                      <Icono size={16} className="text-muted" />
                    </div>
                    <span className="font-medium text-text flex-1">{tipo.nombre}</span>
                    {gasto && !isEdit && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => iniciarEdicion(tipo, gasto)}
                          className="text-muted hover:text-accent transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => eliminar(gasto)}
                          className="text-muted hover:text-error transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Vista capturado */}
                  {gasto && !isEdit && (
                    <div>
                      <p className="text-2xl font-semibold text-text-strong">{formatMXN(gasto.monto)}</p>
                      {gasto.notas && (
                        <p className="text-sm text-muted mt-1">{gasto.notas}</p>
                      )}
                    </div>
                  )}

                  {/* Vista formulario (crear o editar) */}
                  {showForm && (
                    <div className="space-y-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.monto}
                        onChange={(e) => patchForm(tipo.id, { monto: e.target.value }, gasto)}
                        placeholder="0.00"
                        className="w-full h-10 rounded-lg border border-border bg-bg px-3 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                      />
                      <input
                        type="text"
                        value={form.notas}
                        onChange={(e) => patchForm(tipo.id, { notas: e.target.value }, gasto)}
                        placeholder="Notas opcionales"
                        className="w-full h-10 rounded-lg border border-border bg-bg px-3 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                      />
                      {form.error && (
                        <p className="text-xs text-error bg-error/10 rounded-lg px-3 py-2">{form.error}</p>
                      )}
                      <div className="flex gap-2 pt-1">
                        {isEdit && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => cancelarEdicion(tipo.id)}
                            disabled={form.saving}
                          >
                            Cancelar
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={form.saving || form.monto === ""}
                          onClick={() => isEdit ? actualizar(tipo, gasto!.id) : guardar(tipo)}
                        >
                          {form.saving
                            ? <Spinner size={14} />
                            : isEdit ? "Actualizar" : "Guardar"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
