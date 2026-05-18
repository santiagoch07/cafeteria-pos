"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatMXN, formatHora, pesosToCentavos } from "@/lib/format";

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

type Turno = {
  id: number;
  fecha_apertura: string;
  efectivo_inicial: number;
  estado: string;
};

type ModalEstado = "cerrado" | "pago" | "confirmacion";

const PROPINA_PORCENTAJES = [0, 10, 15, 20];

export default function PosPage() {
  const router = useRouter();

  // ── Turno ──
  const [turno, setTurno] = useState<Turno | null>(null);
  const [loadingTurno, setLoadingTurno] = useState(true);
  const [efectivoInicial, setEfectivoInicial] = useState("0");
  const [abriendo, setAbriendo] = useState(false);

  // ── Productos y ticket ──
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ticket, setTicket] = useState<TicketItem[]>([]);
  const [propinaPesos, setPropinaPesos] = useState<string>("0");
  const [propinaPct, setPropinaPct] = useState<number>(0);
  const [modal, setModal] = useState<ModalEstado>("cerrado");
  const [confirmMsg, setConfirmMsg] = useState("");
  const [cobrando, setCobrando] = useState(false);

  // Verificar turno abierto al cargar
  useEffect(() => {
    fetch("/api/turnos/abierto")
      .then((r) => r.json())
      .then((t) => setTurno(t))
      .finally(() => setLoadingTurno(false));
  }, []);

  const fetchProductos = useCallback(async () => {
    const res = await fetch("/api/productos");
    const data: Producto[] = await res.json();
    setProductos(data.filter((p) => p.disponible === 1));
  }, []);

  useEffect(() => {
    if (turno) fetchProductos();
  }, [turno, fetchProductos]);

  async function abrirTurno(e: React.FormEvent) {
    e.preventDefault();
    setAbriendo(true);
    const res = await fetch("/api/turnos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ efectivo_inicial_pesos: parseFloat(efectivoInicial) || 0 }),
    });
    if (res.ok) {
      const t: Turno = await res.json();
      setTurno(t);
    }
    setAbriendo(false);
  }

  // ── Lógica del ticket ──
  const grupos = productos.reduce<Record<string, Producto[]>>((acc, p) => {
    const cat = p.categoria_nombre ?? "Sin categoría";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  function agregarAlTicket(p: Producto) {
    setTicket((prev) => {
      const existente = prev.find((i) => i.producto_id === p.id);
      if (existente) {
        return prev.map((i) =>
          i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...prev,
        { producto_id: p.id, nombre: p.nombre, precio_unitario: p.precio, cantidad: 1 },
      ];
    });
  }

  function cambiarCantidad(producto_id: number, delta: number) {
    setTicket((prev) =>
      prev
        .map((i) => (i.producto_id === producto_id ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0)
    );
  }

  function eliminarItem(producto_id: number) {
    setTicket((prev) => prev.filter((i) => i.producto_id !== producto_id));
  }

  function limpiarTicket() {
    setTicket([]);
    setPropinaPesos("0");
    setPropinaPct(0);
  }

  const subtotalCentavos = ticket.reduce(
    (s, i) => s + i.precio_unitario * i.cantidad,
    0
  );

  function aplicarPropinaPct(pct: number) {
    setPropinaPct(pct);
    setPropinaPesos(((subtotalCentavos * pct) / 100 / 100).toFixed(2));
  }

  function handlePropinaPesosChange(val: string) {
    setPropinaPesos(val);
    setPropinaPct(0);
  }

  const propinaCentavos = pesosToCentavos(parseFloat(propinaPesos) || 0);
  const totalCentavos = subtotalCentavos + propinaCentavos;

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

      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Error al registrar la venta");
        return;
      }

      const orden = await res.json();
      setConfirmMsg(formatMXN(orden.total));
      setModal("confirmacion");
      limpiarTicket();
    } finally {
      setCobrando(false);
    }
  }

  const ticketVacio = ticket.length === 0;

  // ── Loading ──
  if (loadingTurno) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-400 text-lg">Verificando turno…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-100 overflow-hidden">
      {/* ── Panel izquierdo: productos (65%) ── */}
      <div className="flex-[65] flex flex-col overflow-hidden">
        {/* Header con info de turno */}
        <header className="bg-white border-b px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-800">Caja</h1>
            {turno && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                Turno desde las {formatHora(turno.fecha_apertura)}
              </span>
            )}
          </div>
          {turno && (
            <button
              onClick={() => router.push("/corte/turno")}
              className="text-sm text-red-500 hover:text-red-700 font-medium border border-red-200 hover:border-red-400 px-3 rounded-lg min-h-[36px] transition-colors"
            >
              Cerrar turno
            </button>
          )}
        </header>

        {/* Grid de productos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.keys(grupos).length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-xl">Sin productos disponibles</p>
              <a
                href="/admin/productos"
                className="text-amber-500 underline mt-2 inline-block"
              >
                Agregar productos
              </a>
            </div>
          )}
          {Object.entries(grupos).map(([cat, prods]) => (
            <section key={cat}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                {cat}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {prods.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => agregarAlTicket(p)}
                    className="bg-white rounded-xl shadow hover:shadow-md active:scale-95 transition-all p-3 text-left flex flex-col justify-between min-h-[80px]"
                  >
                    <span className="font-semibold text-gray-800 leading-tight text-sm">
                      {p.nombre}
                    </span>
                    <span className="text-amber-600 font-bold mt-1">
                      {formatMXN(p.precio)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* ── Panel derecho: ticket (35%) ── */}
      <div className="flex-[35] bg-white shadow-xl flex flex-col border-l min-w-[280px]">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Ticket</h2>
          {!ticketVacio && (
            <button
              onClick={limpiarTicket}
              className="text-sm text-red-400 hover:text-red-600 font-medium"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {ticketVacio && (
            <p className="text-gray-400 text-center mt-10 text-sm">
              Toca un producto para agregarlo
            </p>
          )}
          {ticket.map((item) => (
            <div
              key={item.producto_id}
              className="flex items-center gap-2 py-2 border-b last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">{item.nombre}</p>
                <p className="text-xs text-gray-500">{formatMXN(item.precio_unitario)} c/u</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => cambiarCantidad(item.producto_id, -1)}
                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 flex items-center justify-center"
                >
                  −
                </button>
                <span className="w-6 text-center font-semibold text-sm">{item.cantidad}</span>
                <button
                  onClick={() => cambiarCantidad(item.producto_id, 1)}
                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 flex items-center justify-center"
                >
                  +
                </button>
              </div>
              <span className="text-sm font-semibold text-gray-700 w-16 text-right">
                {formatMXN(item.precio_unitario * item.cantidad)}
              </span>
              <button
                onClick={() => eliminarItem(item.producto_id)}
                className="text-gray-300 hover:text-red-500 transition-colors ml-1"
                title="Eliminar"
              >
                🗑
              </button>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="px-4 py-3 border-t space-y-3 bg-gray-50">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium">{formatMXN(subtotalCentavos)}</span>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600 font-medium">Propina</p>
            <div className="flex gap-1">
              {PROPINA_PORCENTAJES.map((pct) => (
                <button
                  key={pct}
                  onClick={() => aplicarPropinaPct(pct)}
                  className={`flex-1 rounded-lg text-xs font-semibold py-2 transition-colors min-h-[36px] ${
                    propinaPct === pct && pct > 0
                      ? "bg-amber-500 text-white"
                      : pct === 0 && propinaCentavos === 0
                      ? "bg-amber-500 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  {pct === 0 ? "Sin" : `${pct}%`}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0"
              step="0.50"
              value={propinaPesos}
              onChange={(e) => handlePropinaPesosChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Monto de propina en pesos"
            />
          </div>

          <div className="flex justify-between text-xl font-bold text-gray-800 pt-1">
            <span>Total</span>
            <span>{formatMXN(totalCentavos)}</span>
          </div>

          <button
            onClick={() => setModal("pago")}
            disabled={ticketVacio}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xl rounded-xl min-h-[60px] transition-colors"
          >
            Cobrar
          </button>
        </div>
      </div>

      {/* ── Modal: abrir turno (bloquea el POS si no hay turno) ── */}
      {!turno && !loadingTurno && (
        <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 pt-8 pb-4 text-center">
              <div className="text-5xl mb-3">☕</div>
              <h2 className="text-2xl font-bold text-gray-800">Abrir turno</h2>
              <p className="text-gray-500 text-sm mt-1">
                Ingresa el efectivo inicial en caja para comenzar
              </p>
            </div>
            <form onSubmit={abrirTurno} className="px-6 pb-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Efectivo inicial (pesos)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={efectivoInicial}
                  onChange={(e) => setEfectivoInicial(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-2xl font-bold text-center text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={abriendo}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xl rounded-xl min-h-[60px] transition-colors"
              >
                {abriendo ? "Abriendo…" : "Abrir caja"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: método de pago ── */}
      {modal === "pago" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-2xl font-bold text-gray-800 text-center mb-1">
                Método de pago
              </h3>
              <p className="text-center text-3xl font-bold text-green-600">
                {formatMXN(totalCentavos)}
              </p>
            </div>
            <div className="px-6 pb-6 grid grid-cols-2 gap-4">
              <button
                onClick={() => cobrar("efectivo")}
                disabled={cobrando}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xl rounded-xl min-h-[80px] flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <span className="text-3xl">💵</span>
                Efectivo
              </button>
              <button
                onClick={() => cobrar("tarjeta")}
                disabled={cobrando}
                className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-bold text-xl rounded-xl min-h-[80px] flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <span className="text-3xl">💳</span>
                Tarjeta
              </button>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => setModal("cerrado")}
                disabled={cobrando}
                className="w-full border border-gray-300 text-gray-600 font-semibold rounded-xl min-h-[60px] hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: confirmación ── */}
      {modal === "confirmacion" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm px-8 py-10 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-gray-800">Venta registrada</h3>
            <p className="text-4xl font-bold text-green-600 mt-2">{confirmMsg}</p>
            <button
              onClick={() => setModal("cerrado")}
              className="mt-8 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xl rounded-xl min-h-[60px] transition-colors"
            >
              Nueva venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
