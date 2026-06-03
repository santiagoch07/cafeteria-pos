import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { fechaRelativa, pctCambio } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// UTC-6 (CST México): medianoche local = 06:00 UTC
function diaRango(fecha: string) {
  return {
    inicio: `${fecha}T06:00:00.000Z`,
    fin: `${fechaRelativa(fecha, 1)}T06:00:00.000Z`,
  };
}

export async function GET(request: Request) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha") ?? new Date().toISOString().slice(0, 10);

  const rango = diaRango(fecha);
  const rangoAyer = diaRango(fechaRelativa(fecha, -1));
  const rangoSemana = diaRango(fechaRelativa(fecha, -7));

  const [
    { data: ordenes, error: errOrdenes },
    { data: ordenesAyer, error: errAyer },
    { data: ordenesSemana, error: errSemana },
    { data: turnos, error: errTurnos },
  ] = await Promise.all([
    supabase
      .from("ordenes")
      .select("*, items:orden_items(cantidad, precio_unitario, producto:productos(id, nombre))")
      .gte("fecha", rango.inicio)
      .lt("fecha", rango.fin),
    supabase
      .from("ordenes")
      .select("total")
      .gte("fecha", rangoAyer.inicio)
      .lt("fecha", rangoAyer.fin),
    supabase
      .from("ordenes")
      .select("total")
      .gte("fecha", rangoSemana.inicio)
      .lt("fecha", rangoSemana.fin),
    supabase
      .from("turnos")
      .select("id, fecha_apertura, fecha_cierre, efectivo_inicial, efectivo_final_real, efectivo_final_sistema, diferencia, estado")
      .gte("fecha_apertura", rango.inicio)
      .lt("fecha_apertura", rango.fin)
      .order("fecha_apertura", { ascending: true }),
  ]);

  if (errOrdenes) return NextResponse.json({ error: errOrdenes.message }, { status: 500 });
  if (errAyer) return NextResponse.json({ error: errAyer.message }, { status: 500 });
  if (errSemana) return NextResponse.json({ error: errSemana.message }, { status: 500 });
  if (errTurnos) return NextResponse.json({ error: errTurnos.message }, { status: 500 });

  const rows = ordenes ?? [];

  // KPIs
  const ventas_totales = rows.reduce((s, o) => s + o.total, 0);
  const num_tickets = rows.length;
  const ticket_promedio = num_tickets > 0 ? Math.round(ventas_totales / num_tickets) : 0;
  const propinas = rows.reduce((s, o) => s + o.propina, 0);

  // Comparativos (null si el día anterior no tiene ventas)
  const totalAyer = (ordenesAyer ?? []).reduce((s, o) => s + o.total, 0);
  const totalSemana = (ordenesSemana ?? []).reduce((s, o) => s + o.total, 0);

  // Métodos de pago
  const metodos_pago = {
    efectivo: rows
      .filter((o) => o.metodo_pago === "efectivo")
      .reduce((s, o) => s + o.total, 0),
    tarjeta: rows
      .filter((o) => o.metodo_pago === "tarjeta")
      .reduce((s, o) => s + o.total, 0),
  };

  // Top 5 productos por total vendido
  const productoMap = new Map<string, { nombre: string; cantidad: number; total: number }>();
  for (const orden of rows) {
    for (const item of (orden.items as { cantidad: number; precio_unitario: number; producto: { id: string; nombre: string } | null }[]) ?? []) {
      if (!item.producto) continue;
      const key = item.producto.id;
      const existing = productoMap.get(key);
      const itemTotal = item.precio_unitario * item.cantidad;
      if (existing) {
        existing.cantidad += item.cantidad;
        existing.total += itemTotal;
      } else {
        productoMap.set(key, { nombre: item.producto.nombre, cantidad: item.cantidad, total: itemTotal });
      }
    }
  }
  const top_productos = Array.from(productoMap.entries())
    .map(([producto_id, d]) => ({ producto_id, ...d }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Ventas por hora (0-23, UTC — ajustar +offset si se mueve a CDT)
  const horaMap = new Map<number, number>();
  for (const orden of rows) {
    const hora = new Date(orden.fecha).getUTCHours();
    horaMap.set(hora, (horaMap.get(hora) ?? 0) + orden.total);
  }
  const ventas_por_hora = Array.from({ length: 24 }, (_, h) => ({
    hora: h,
    total: horaMap.get(h) ?? 0,
  }));

  // Turnos con total vendido calculado de las ordenes ya cargadas
  const turnoRows = (turnos ?? []).map((t) => ({
    id: t.id,
    fecha_apertura: t.fecha_apertura,
    fecha_cierre: t.fecha_cierre,
    efectivo_inicial: t.efectivo_inicial,
    efectivo_final_sistema: t.efectivo_final_sistema,
    efectivo_final_real: t.efectivo_final_real,
    diferencia: t.diferencia,
    estado: t.estado,
    total_vendido: rows
      .filter((o) => o.turno_id === t.id)
      .reduce((s, o) => s + o.total, 0),
  }));

  return NextResponse.json({
    fecha,
    kpis: { ventas_totales, num_tickets, ticket_promedio, propinas },
    comparativos: {
      vs_ayer: pctCambio(ventas_totales, totalAyer),
      vs_semana_pasada: pctCambio(ventas_totales, totalSemana),
    },
    metodos_pago,
    top_productos,
    ventas_por_hora,
    turnos: turnoRows,
  });
}
