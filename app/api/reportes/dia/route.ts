import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { formatFechaEspanol, pctCambio, fechaRelativa } from "@/lib/format";

type KPIRow = { tickets: number; total: number; propinas: number };
type MetodoRow = { metodo_pago: string; tickets: number; total: number; propinas: number };
type ProductoRow = { nombre: string; cantidad: number; total: number };
type HoraRow = { hora: string; tickets: number; total: number };
type TurnoRow = {
  id: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
  efectivo_inicial: number;
  efectivo_final_sistema: number | null;
  efectivo_final_real: number | null;
  diferencia: number | null;
  notas: string | null;
  estado: string;
};

function kpisDelDia(db: ReturnType<typeof getDb>, fecha: string): KPIRow {
  return db
    .prepare(
      `SELECT
         COUNT(*) AS tickets,
         COALESCE(SUM(total), 0) AS total,
         COALESCE(SUM(propina), 0) AS propinas
       FROM ordenes
       WHERE DATE(creado_en) = ?`
    )
    .get(fecha) as KPIRow;
}

export async function GET(request: Request) {
  const db = getDb();
  const { searchParams } = new URL(request.url);

  // Fecha por defecto: hoy
  const fecha =
    searchParams.get("fecha") ??
    (db.prepare("SELECT DATE('now','localtime') AS f").get() as { f: string }).f;

  const kpis = kpisDelDia(db, fecha);
  const ticketPromedio =
    kpis.tickets > 0 ? Math.round(kpis.total / kpis.tickets) : 0;

  // Comparativos
  const ayer = fechaRelativa(fecha, -1);
  const semanaAntes = fechaRelativa(fecha, -7);
  const kpisAyer = kpisDelDia(db, ayer);
  const kpisSemana = kpisDelDia(db, semanaAntes);

  const comparativo_ayer = {
    total_pct: pctCambio(kpis.total, kpisAyer.total),
    tickets_pct: pctCambio(kpis.tickets, kpisAyer.tickets),
  };
  const comparativo_semana = {
    total_pct: pctCambio(kpis.total, kpisSemana.total),
    tickets_pct: pctCambio(kpis.tickets, kpisSemana.tickets),
  };

  // Por método de pago
  const por_metodo = db
    .prepare(
      `SELECT
         metodo_pago,
         COUNT(*) AS tickets,
         COALESCE(SUM(total), 0) AS total,
         COALESCE(SUM(propina), 0) AS propinas
       FROM ordenes
       WHERE DATE(creado_en) = ?
       GROUP BY metodo_pago`
    )
    .all(fecha) as MetodoRow[];

  // Top 5 productos
  const top_productos = db
    .prepare(
      `SELECT
         p.nombre,
         SUM(oi.cantidad) AS cantidad,
         SUM(oi.cantidad * oi.precio_unitario) AS total
       FROM orden_items oi
       JOIN ordenes o ON oi.orden_id = o.id
       JOIN productos p ON oi.producto_id = p.id
       WHERE DATE(o.creado_en) = ?
       GROUP BY oi.producto_id
       ORDER BY total DESC
       LIMIT 5`
    )
    .all(fecha) as ProductoRow[];

  // Ventas por hora
  const ventasPorHoraRaw = db
    .prepare(
      `SELECT
         strftime('%H', creado_en) AS hora,
         COUNT(*) AS tickets,
         COALESCE(SUM(total), 0) AS total
       FROM ordenes
       WHERE DATE(creado_en) = ?
       GROUP BY hora
       ORDER BY hora`
    )
    .all(fecha) as HoraRow[];

  // Rellenar horas sin ventas (6-22) para que la gráfica sea continua
  const horasMap = new Map(ventasPorHoraRaw.map((r) => [r.hora, r]));
  const ventas_por_hora: HoraRow[] = [];
  for (let h = 6; h <= 22; h++) {
    const key = String(h).padStart(2, "0");
    ventas_por_hora.push(horasMap.get(key) ?? { hora: key, tickets: 0, total: 0 });
  }

  // Turnos del día
  const turnos_dia = db
    .prepare(
      `SELECT * FROM turnos
       WHERE DATE(fecha_apertura) = ?
       ORDER BY fecha_apertura ASC`
    )
    .all(fecha) as TurnoRow[];

  return NextResponse.json({
    fecha,
    fecha_display: formatFechaEspanol(fecha),
    kpis: {
      total: kpis.total,
      tickets: kpis.tickets,
      ticket_promedio: ticketPromedio,
      propinas: kpis.propinas,
    },
    comparativo_ayer,
    comparativo_semana,
    por_metodo,
    top_productos,
    ventas_por_hora,
    turnos_dia,
  });
}
