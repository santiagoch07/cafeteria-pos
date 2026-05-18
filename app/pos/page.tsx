"use client";

import { useEffect, useState, useCallback } from "react";
import { formatMXN, pesosToCentavos } from "@/lib/format";

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

type ModalEstado = "cerrado" | "pago" | "confirmacion";

const PROPINA_PORCENTAJES = [0, 10, 15, 20];

export default function PosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ticket, setTicket] = useState<TicketItem[]>([]);
  const [propinaPesos, setPropinaPesos] = useState<string>("0");
  const [propinaPct, setPropinaPct] = useState<number>(0);
  const [modal, setModal] = useState<ModalEstado>("cerrado");
  const [confirmMsg, setConfirmMsg] = useState("");
  const [cobrando, setCobrando] = useState(false);

  const fetchProductos = useCallback(async () => {
    const res = await fetch("/api/productos");
    const data: Producto[] = await res.json();
    setProductos(data.filter((p) => p.disponible === 1));
  }, []);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  // Agrupar por categoría
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
      return [...prev, { producto_id: p.id, nombre: p.nombre, precio_unitario: p.precio, cantidad: 1 }];
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

  const subtotalCentavos = ticket.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);

  function aplicarPropinaPct(pct: number) {
    setPropinaPct(pct);
    const monto = (subtotalCentavos * pct) / 100 / 100; // centavos → pesos
    setPropinaPesos(monto.toFixed(2));
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

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* ── Panel izquierdo: productos (65%) ── */}
      <div className="flex-[65] flex flex-col overflow-hidden">
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Cafetería POS</h1>
          <a
            href="/admin/productos"
            className="text-sm text-amber-600 hover:underline font-medium"
          >
            Administrar productos
          </a>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.keys(grupos).length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-xl">Sin productos disponibles</p>
              <a href="/admin/productos" className="text-amber-500 underline mt-2 inline-block">
                Agregar productos
              </a>
            </div>
          )}
          {Object.entries(grupos).map(([cat, prods]) => (
            <section key={cat}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                {cat}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {prods.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => agregarAlTicket(p)}
                    className="bg-white rounded-xl shadow hover:shadow-md active:scale-95 transition-all p-3 text-left flex flex-col justify-between min-h-[80px]"
                  >
                    <span className="font-semibold text-gray-800 leading-tight">{p.nombre}</span>
                    <span className="text-amber-600 font-bold mt-1">{formatMXN(p.precio)}</span>
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

        {/* Items del ticket */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {ticketVacio && (
            <p className="text-gray-400 text-center mt-10">Toca un producto para agregarlo</p>
          )}
          {ticket.map((item) => (
            <div key={item.producto_id} className="flex items-center gap-2 py-2 border-b last:border-0">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">{item.nombre}</p>
                <p className="text-xs text-gray-500">{formatMXN(item.precio_unitario)} c/u</p>
              </div>
              {/* Controles de cantidad */}
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
              {/* Subtotal del item */}
              <span className="text-sm font-semibold text-gray-700 w-16 text-right">
                {formatMXN(item.precio_unitario * item.cantidad)}
              </span>
              {/* Eliminar */}
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

        {/* Totales y propina */}
        <div className="px-4 py-3 border-t space-y-3 bg-gray-50">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium">{formatMXN(subtotalCentavos)}</span>
          </div>

          {/* Propina */}
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

      {/* ── Modal: elegir método de pago ── */}
      {modal === "pago" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-2xl font-bold text-gray-800 text-center mb-1">Método de pago</h3>
              <p className="text-center text-3xl font-bold text-green-600">{formatMXN(totalCentavos)}</p>
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
