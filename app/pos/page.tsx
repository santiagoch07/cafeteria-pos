"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, Banknote, CreditCard, CheckCircle2 } from "lucide-react";
import { formatMXN, formatHora, pesosToCentavos } from "@/lib/format";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";

type Producto = {
  id: number;
  nombre: string;
  precio: number;
  categoria_id: number | null;
  categoria_nombre: string | null;
  disponible: number;
};

type TicketItem = {
  producto_id: number;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
};

type Turno = { id: number; fecha_apertura: string; efectivo_inicial: number; estado: string };

const PROPINA_PCTS = [0, 10, 15, 20];

export default function PosPage() {
  const router = useRouter();

  // ── Turno ──────────────────────────────────────
  const [turno, setTurno]             = useState<Turno | null>(null);
  const [loadingTurno, setLoadingTurno] = useState(true);
  const [turnoModal, setTurnoModal]   = useState(false);
  const [efectivoInicial, setEfectivoInicial] = useState("0");
  const [abriendo, setAbriendo]       = useState(false);

  // ── Productos ───────────────────────────────────
  const [productos, setProductos]     = useState<Producto[]>([]);
  const [categoriaActiva, setCategoriaActiva] = useState<string>("Todos");

  // ── Ticket ──────────────────────────────────────
  const [ticket, setTicket]           = useState<TicketItem[]>([]);
  const [propinaPesos, setPropinaPesos] = useState("0");
  const [propinaPct, setPropinaPct]   = useState(0);

  // ── Modales ─────────────────────────────────────
  const [pagoModal, setPagoModal]     = useState(false);
  const [cobrando, setCobrando]       = useState(false);
  const [toast, setToast]             = useState<string | null>(null);

  // ── Turno: check al montar ───────────────────────
  useEffect(() => {
    fetch("/api/turnos/abierto")
      .then((r) => r.json())
      .then((t) => {
        setTurno(t);
        if (!t) setTurnoModal(true);
      })
      .finally(() => setLoadingTurno(false));
  }, []);

  const fetchProductos = useCallback(async () => {
    const res = await fetch("/api/productos");
    const data: Producto[] = await res.json();
    setProductos(data.filter((p) => p.disponible === 1));
  }, []);

  useEffect(() => { if (turno) fetchProductos(); }, [turno, fetchProductos]);

  async function abrirTurno(e: React.FormEvent) {
    e.preventDefault();
    setAbriendo(true);
    const res = await fetch("/api/turnos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ efectivo_inicial_pesos: parseFloat(efectivoInicial) || 0 }),
    });
    if (res.ok) {
      setTurno(await res.json());
      setTurnoModal(false);
    }
    setAbriendo(false);
  }

  // ── Categorías ──────────────────────────────────
  const categorias = ["Todos", ...Array.from(new Set(productos.map((p) => p.categoria_nombre ?? "Sin categoría")))];
  const productosFiltrados = categoriaActiva === "Todos"
    ? productos
    : productos.filter((p) => (p.categoria_nombre ?? "Sin categoría") === categoriaActiva);

  // ── Ticket helpers ──────────────────────────────
  function agregar(p: Producto) {
    setTicket((prev) => {
      const ex = prev.find((i) => i.producto_id === p.id);
      if (ex) return prev.map((i) => i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { producto_id: p.id, nombre: p.nombre, precio_unitario: p.precio, cantidad: 1 }];
    });
  }

  function cambiarCantidad(id: number, delta: number) {
    setTicket((prev) =>
      prev.map((i) => i.producto_id === id ? { ...i, cantidad: i.cantidad + delta } : i)
          .filter((i) => i.cantidad > 0)
    );
  }

  function eliminar(id: number) {
    setTicket((prev) => prev.filter((i) => i.producto_id !== id));
  }

  function limpiar() {
    setTicket([]); setPropinaPesos("0"); setPropinaPct(0);
  }

  const subtotal = ticket.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);

  function setPct(pct: number) {
    setPropinaPct(pct);
    setPropinaPesos(((subtotal * pct) / 100 / 100).toFixed(2));
  }

  const propinaCentavos = pesosToCentavos(parseFloat(propinaPesos) || 0);
  const total = subtotal + propinaCentavos;

  async function cobrar(metodo_pago: "efectivo" | "tarjeta") {
    setCobrando(true);
    try {
      const res = await fetch("/api/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: ticket.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
          propina_pesos: parseFloat(propinaPesos) || 0,
          metodo_pago,
          turno_id: turno?.id ?? null,
        }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error ?? "Error"); return; }
      const orden = await res.json();
      setPagoModal(false);
      limpiar();
      setToast(`Venta de ${formatMXN(orden.total)} registrada`);
      setTimeout(() => setToast(null), 2000);
    } finally {
      setCobrando(false);
    }
  }

  const vacio = ticket.length === 0;
  const cantidadEnTicket = (id: number) => ticket.find((i) => i.producto_id === id)?.cantidad ?? 0;

  if (loadingTurno) {
    return (
      <div className="h-full flex items-center justify-center bg-bg">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-bg overflow-hidden">

      {/* ── Columna izquierda: productos 65% ─────── */}
      <div className="flex-[65] flex flex-col overflow-hidden border-r border-border">

        {/* Header del turno */}
        <div className="flex items-center justify-between px-4 h-11 border-b border-border shrink-0">
          {turno
            ? <span className="text-xs text-muted">Turno desde las <span className="text-text">{formatHora(turno.fecha_apertura)}</span></span>
            : <span className="text-xs text-muted">Sin turno activo</span>
          }
          {turno && (
            <button
              onClick={() => router.push("/corte/turno")}
              className="text-xs text-muted hover:text-error transition-colors"
            >
              Cerrar turno
            </button>
          )}
        </div>

        {/* Pills de categorías */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto shrink-0 border-b border-border">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaActiva(cat)}
              className="shrink-0"
            >
              <Badge variant={categoriaActiva === cat ? "accent" : "default"}>
                {cat}
              </Badge>
            </button>
          ))}
        </div>

        {/* Grid de productos */}
        <div className="flex-1 overflow-y-auto p-4">
          {productosFiltrados.length === 0 ? (
            <div className="text-center mt-20 text-muted">Sin productos en esta categoría</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {productosFiltrados.map((p) => {
                const qty = cantidadEnTicket(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => agregar(p)}
                    className={`relative bg-surface border rounded-xl p-4 text-left flex flex-col justify-between min-h-[80px] transition-all duration-150 hover:border-accent active:scale-[0.98] ${qty > 0 ? "border-accent" : "border-border"}`}
                  >
                    {qty > 0 && (
                      <span className="absolute top-2 right-2 bg-accent text-black text-xs font-medium px-1.5 py-0.5 rounded-full leading-none">
                        ×{qty}
                      </span>
                    )}
                    <span className="font-medium text-text text-sm leading-snug pr-6">{p.nombre}</span>
                    <span className="font-semibold text-text-strong text-base mt-2">{formatMXN(p.precio)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Columna derecha: ticket 35% ──────────── */}
      <div className="flex-[35] bg-surface flex flex-col min-w-[280px]">

        {/* Header ticket */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
          <p className="text-xs text-muted uppercase tracking-wider">Orden actual</p>
          {!vacio && (
            <button onClick={limpiar} className="text-xs text-muted hover:text-error transition-colors">
              Limpiar
            </button>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4">
          {vacio ? (
            <p className="text-muted text-sm text-center mt-12">Toca un producto para agregarlo</p>
          ) : (
            <div className="divide-y divide-border">
              {ticket.map((item) => (
                <div key={item.producto_id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-text truncate">{item.nombre}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => cambiarCantidad(item.producto_id, -1)}
                      className="w-7 h-7 rounded-full bg-bg flex items-center justify-center text-muted hover:text-text transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center text-sm font-medium text-text">{item.cantidad}</span>
                    <button
                      onClick={() => cambiarCantidad(item.producto_id, 1)}
                      className="w-7 h-7 rounded-full bg-bg flex items-center justify-center text-muted hover:text-text transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-text-strong w-16 text-right shrink-0">
                    {formatMXN(item.precio_unitario * item.cantidad)}
                  </span>
                  <button
                    onClick={() => eliminar(item.producto_id)}
                    className="text-muted hover:text-error transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totales + cobrar */}
        <div className="px-4 pb-4 pt-3 border-t border-border space-y-3 shrink-0">
          {/* Subtotal */}
          <div className="flex justify-between">
            <span className="text-sm text-muted">Subtotal</span>
            <span className="text-base text-text">{formatMXN(subtotal)}</span>
          </div>

          {/* Propina */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Propina</span>
              <span className="text-base text-text">{formatMXN(propinaCentavos)}</span>
            </div>
            <div className="flex gap-1.5">
              {PROPINA_PCTS.map((pct) => {
                const active = pct === 0 ? propinaCentavos === 0 : propinaPct === pct;
                return (
                  <button
                    key={pct}
                    onClick={() => setPct(pct)}
                    className={`flex-1 rounded-lg text-xs py-1.5 transition-colors ${active ? "bg-accent text-black font-medium" : "bg-bg text-muted hover:text-text"}`}
                  >
                    {pct === 0 ? "Sin" : `${pct}%`}
                  </button>
                );
              })}
            </div>
            <input
              type="number" min="0" step="0.50"
              value={propinaPesos}
              onChange={(e) => { setPropinaPesos(e.target.value); setPropinaPct(0); }}
              className="w-full h-9 rounded-lg border border-border bg-bg px-3 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
              placeholder="Monto libre (pesos)"
            />
          </div>

          {/* Total grande */}
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-0.5">Total</p>
            <p className="text-5xl font-semibold text-accent leading-none">{formatMXN(total)}</p>
          </div>

          <Button
            variant="primary" size="xl"
            className="w-full"
            disabled={vacio}
            onClick={() => setPagoModal(true)}
          >
            {vacio ? "Cobrar" : `Cobrar ${formatMXN(total)}`}
          </Button>
        </div>
      </div>

      {/* ── Modal: abrir turno ──────────────────── */}
      <Modal open={turnoModal} title="Abrir turno">
        <form onSubmit={abrirTurno} className="p-6 space-y-5">
          <p className="text-sm text-muted">Ingresa el efectivo inicial en caja para comenzar el turno.</p>
          <div>
            <label className="text-sm font-medium text-muted block mb-1.5">Efectivo inicial (pesos)</label>
            <input
              type="number" min="0" step="0.01" autoFocus
              value={efectivoInicial}
              onChange={(e) => setEfectivoInicial(e.target.value)}
              className="w-full h-16 rounded-lg border border-border bg-bg px-4 text-3xl font-semibold text-center text-text-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
            />
          </div>
          <Button type="submit" variant="primary" size="xl" className="w-full" disabled={abriendo}>
            {abriendo ? <Spinner size={18} /> : "Abrir caja"}
          </Button>
        </form>
      </Modal>

      {/* ── Modal: método de pago ───────────────── */}
      <Modal open={pagoModal} onClose={() => !cobrando && setPagoModal(false)} title="¿Cómo te pagan?">
        <div className="p-6 space-y-4">
          <p className="text-center text-4xl font-semibold text-accent">{formatMXN(total)}</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { metodo: "efectivo" as const, label: "Efectivo", Icon: Banknote },
              { metodo: "tarjeta" as const,  label: "Tarjeta",  Icon: CreditCard },
            ].map(({ metodo, label, Icon }) => (
              <button
                key={metodo}
                onClick={() => cobrar(metodo)}
                disabled={cobrando}
                className="bg-surface-2 border border-border hover:border-accent rounded-xl p-6 flex flex-col items-center gap-3 transition-all duration-150 active:scale-[0.97] disabled:opacity-50 cursor-pointer"
              >
                <Icon size={32} className="text-accent" />
                <span className="text-base font-medium text-text">{label}</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="lg" className="w-full" onClick={() => setPagoModal(false)} disabled={cobrando}>
            Cancelar
          </Button>
        </div>
      </Modal>

      {/* ── Toast de confirmación ───────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface border border-border rounded-xl px-5 py-3 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-success shrink-0" />
          <span className="text-base font-medium text-text">{toast}</span>
        </div>
      )}
    </div>
  );
}
