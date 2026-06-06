"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Home, Users, Zap, Package, Wrench, CreditCard,
  Megaphone, Receipt, MoreHorizontal, Pencil, Trash2,
  EyeOff, Eye, Tag, Plus,
  type LucideIcon,
} from "lucide-react";
import { formatMXN } from "@/lib/format";
import type { TipoGastoVisible } from "@/lib/tipos-gasto";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";

type Gasto = {
  id: string;
  mes: number;
  año: number;
  tipo_gasto_id: string | null;
  tipo_gasto_empresa_id: string | null;
  monto: number;
  notas: string | null;
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
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [año, setAño] = useState(ahora.getFullYear());
  const [tipos,  setTipos]  = useState<TipoGastoVisible[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [forms,   setForms]   = useState<Record<string, FormEntry>>({});
  const [editing, setEditing] = useState<Set<string>>(new Set());

  // Gestión de tipos
  const [menuOpenId,    setMenuOpenId]    = useState<string | null>(null);
  const [renamingId,    setRenamingId]    = useState<string | null>(null);
  const [renameValue,   setRenameValue]   = useState("");
  const [mostrarOcultos, setMostrarOcultos] = useState(false);

  // Modal nueva categoría
  const [modalNuevo,     setModalNuevo]     = useState(false);
  const [nombreNuevo,    setNombreNuevo]    = useState("");
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  // ── Fetch ────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/tipos-gasto", { cache: "no-store" })
      .then((r) => r.json())
      .then(setTipos);
  }, []);

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

  // ── Computed ─────────────────────────────────────────────
  const tiposVisibles = tipos.filter((t) => t.activo);
  const tiposOcultos  = tipos.filter((t) => !t.activo);
  const gastoByTipo   = new Map(gastos.map((g) => [g.tipo_gasto_empresa_id ?? g.tipo_gasto_id, g]));
  const totalGastos   = gastos.reduce((s, g) => s + g.monto, 0);
  const esHoy         = mes === ahora.getMonth() + 1 && año === ahora.getFullYear();

  // ── Form helpers ─────────────────────────────────────────
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
      [tipoId]: {
        ...(prev[tipoId] ?? { ...FORM_VACIO, monto: gasto ? String(gasto.monto / 100) : "", notas: gasto?.notas ?? "" }),
        ...updates,
      },
    }));
  }

  function clearForm(tipoId: string) {
    setForms((prev) => { const n = { ...prev }; delete n[tipoId]; return n; });
  }

  // ── Gasto actions ────────────────────────────────────────
  async function guardar(tipo: TipoGastoVisible) {
    const form = getForm(tipo.id);
    if (form.monto === "") return;
    const montoPesos = parseFloat(form.monto);
    if (isNaN(montoPesos) || montoPesos < 0) return;

    patchForm(tipo.id, { saving: true, error: "" });
    const res = await fetch("/api/gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mes, año,
        tipo_id: tipo.id,
        es_base: tipo.tipo_gasto_id !== null,
        monto_pesos: montoPesos,
        notas: form.notas.trim() || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { patchForm(tipo.id, { saving: false, error: data.error ?? "Error al guardar" }); return; }
    setGastos((prev) => [...prev, data]);
    clearForm(tipo.id);
  }

  async function actualizar(tipo: TipoGastoVisible, gastoId: string) {
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

  function iniciarEdicion(tipo: TipoGastoVisible, gasto: Gasto) {
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

  async function eliminarGasto(gasto: Gasto) {
    if (!confirm("¿Eliminar este gasto?")) return;
    const res = await fetch(`/api/gastos/${gasto.id}`, { method: "DELETE" });
    if (res.ok) setGastos((prev) => prev.filter((g) => g.id !== gasto.id));
  }

  // ── Tipo management ──────────────────────────────────────
  function iniciarRename(tipo: TipoGastoVisible) {
    setRenamingId(tipo.id);
    setRenameValue(tipo.nombre);
  }

  async function guardarRename(tipo: TipoGastoVisible) {
    const nombre = renameValue.trim();
    setRenamingId(null);
    if (!nombre || nombre === tipo.nombre) return;

    const res = await fetch(`/api/tipos-gasto/${tipo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, es_base_id: tipo.tipo_gasto_id !== null }),
    });
    if (res.ok) {
      setTipos((prev) => prev.map((t) => t.id === tipo.id ? { ...t, nombre } : t));
    }
  }

  async function ocultarTipo(tipo: TipoGastoVisible) {
    if (!confirm(`¿Ocultar "${tipo.nombre}"? Podrás reactivarla cuando quieras.`)) return;
    const res = await fetch(`/api/tipos-gasto/${tipo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: false, es_base_id: tipo.tipo_gasto_id !== null }),
    });
    if (res.ok) {
      setTipos((prev) => prev.map((t) => t.id === tipo.id ? { ...t, activo: false } : t));
    }
  }

  async function reactivarTipo(tipo: TipoGastoVisible) {
    const res = await fetch(`/api/tipos-gasto/${tipo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: true, es_base_id: tipo.tipo_gasto_id !== null }),
    });
    if (res.ok) {
      setTipos((prev) => prev.map((t) => t.id === tipo.id ? { ...t, activo: true } : t));
    }
  }

  async function eliminarTipo(tipo: TipoGastoVisible) {
    if (!confirm(`¿Eliminar la categoría "${tipo.nombre}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/tipos-gasto/${tipo.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "No se pudo eliminar");
      return;
    }
    setTipos((prev) => prev.filter((t) => t.id !== tipo.id));
  }

  async function crearNuevaTipo() {
    if (!nombreNuevo.trim()) return;
    setGuardandoNuevo(true);
    const res = await fetch("/api/tipos-gasto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombreNuevo.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      const nuevoTipo: TipoGastoVisible = {
        id: data.id,
        nombre: data.nombre_custom ?? nombreNuevo.trim(),
        orden: data.orden_custom ?? 999,
        es_base: false,
        activo: true,
        tipo_base_id: null,
        tipo_gasto_empresa_id: data.id,
        tipo_gasto_id: null,
      };
      setTipos((prev) => [...prev, nuevoTipo]);
      setNombreNuevo("");
      setModalNuevo(false);
    }
    setGuardandoNuevo(false);
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto bg-bg">
      {/* Overlay para cerrar menús al hacer click fuera */}
      {menuOpenId && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-text-strong">Gastos del mes</h1>
            <p className="text-sm text-muted mt-0.5">
              Captura los gastos fijos y variables para calcular tu rentabilidad
            </p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap items-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setModalNuevo(true); setNombreNuevo(""); }}
            >
              <Plus size={14} className="mr-1" />
              Nueva categoría
            </Button>
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
          <p className="text-sm text-muted mt-2">
            {gastos.length} de {tiposVisibles.length} categorías capturadas
          </p>
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

        {/* Lista de tipos activos */}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={28} /></div>
        ) : (
          <div className="space-y-3">
            {tiposVisibles.map((tipo) => {
              const gasto    = gastoByTipo.get(tipo.id);
              const isEdit   = editing.has(tipo.id);
              const showForm = !gasto || isEdit;
              const form     = getForm(tipo.id, gasto);
              const Icono    = ICONO_POR_ORDEN[tipo.orden] ?? Tag;

              return (
                <div key={tipo.id} className="bg-surface border border-border rounded-xl p-5 space-y-3">
                  {/* Encabezado de la card */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
                      <Icono size={16} className="text-muted" />
                    </div>

                    {renamingId === tipo.id ? (
                      // Rename inline
                      <form
                        className="flex items-center gap-2 flex-1 min-w-0"
                        onSubmit={(e) => { e.preventDefault(); guardarRename(tipo); }}
                      >
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Escape") setRenamingId(null); }}
                          className="flex-1 min-w-0 h-8 rounded-lg border border-accent bg-bg px-2 text-sm text-text focus:outline-none"
                        />
                        <button type="submit" className="text-xs text-accent hover:underline font-medium shrink-0">
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                          className="text-xs text-muted hover:underline shrink-0"
                        >
                          Cancelar
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="font-medium text-text flex-1 min-w-0 truncate">{tipo.nombre}</span>

                        {/* Botones de edición del gasto (cuando hay gasto capturado) */}
                        {gasto && !isEdit && (
                          <>
                            <button
                              onClick={() => iniciarEdicion(tipo, gasto)}
                              className="text-muted hover:text-accent transition-colors p-1 shrink-0"
                              title="Editar monto"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => eliminarGasto(gasto)}
                              className="text-muted hover:text-error transition-colors p-1 shrink-0"
                              title="Eliminar gasto"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}

                        {/* Menú de gestión del tipo */}
                        <div className="relative z-20 shrink-0">
                          <button
                            onClick={() => setMenuOpenId((prev) => prev === tipo.id ? null : tipo.id)}
                            className="text-muted hover:text-text transition-colors p-1 rounded-lg hover:bg-surface-2"
                            title="Opciones de categoría"
                          >
                            <MoreHorizontal size={15} />
                          </button>
                          {menuOpenId === tipo.id && (
                            <div className="absolute right-0 top-8 w-48 bg-surface border border-border rounded-xl z-30 overflow-hidden py-1">
                              <button
                                onClick={() => { iniciarRename(tipo); setMenuOpenId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2 transition-colors text-left"
                              >
                                <Pencil size={13} />
                                Renombrar
                              </button>
                              {tipo.es_base ? (
                                <button
                                  onClick={() => { ocultarTipo(tipo); setMenuOpenId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted hover:bg-surface-2 transition-colors text-left"
                                >
                                  <EyeOff size={13} />
                                  Ocultar
                                </button>
                              ) : (
                                <button
                                  onClick={() => { eliminarTipo(tipo); setMenuOpenId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-surface-2 transition-colors text-left"
                                >
                                  <Trash2 size={13} />
                                  Eliminar categoría
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Monto capturado */}
                  {gasto && !isEdit && (
                    <div>
                      <p className="text-2xl font-semibold text-text-strong">{formatMXN(gasto.monto)}</p>
                      {gasto.notas && (
                        <p className="text-sm text-muted mt-1">{gasto.notas}</p>
                      )}
                    </div>
                  )}

                  {/* Formulario (crear o editar) */}
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

        {/* Categorías ocultas */}
        {tiposOcultos.length > 0 && (
          <div>
            <button
              onClick={() => setMostrarOcultos((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors"
            >
              <Eye size={14} />
              {mostrarOcultos
                ? "Ocultar categorías desactivadas"
                : `Mostrar ${tiposOcultos.length} categoría${tiposOcultos.length !== 1 ? "s" : ""} oculta${tiposOcultos.length !== 1 ? "s" : ""}`}
            </button>
            {mostrarOcultos && (
              <div className="space-y-2 mt-3">
                {tiposOcultos.map((tipo) => (
                  <div
                    key={tipo.id}
                    className="bg-surface border border-border rounded-xl px-5 py-3 flex items-center gap-3 opacity-60"
                  >
                    <span className="text-sm text-muted flex-1">{tipo.nombre}</span>
                    <button
                      onClick={() => reactivarTipo(tipo)}
                      className="text-xs text-accent hover:underline font-medium shrink-0"
                    >
                      Reactivar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: nueva categoría */}
      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Nueva categoría" maxWidth="sm">
        <form
          className="p-6 space-y-4"
          onSubmit={(e) => { e.preventDefault(); crearNuevaTipo(); }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted">Nombre de la categoría</label>
            <input
              autoFocus
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              placeholder="Ej. Hielo y popotes"
              className="h-12 w-full rounded-lg border border-border bg-surface px-4 text-base text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModalNuevo(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={guardandoNuevo || !nombreNuevo.trim()}
            >
              {guardandoNuevo ? <Spinner size={14} /> : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
