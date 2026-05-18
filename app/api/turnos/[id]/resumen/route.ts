import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const db = getDb();
  const id = parseInt(params.id, 10);

  const turno = db
    .prepare("SELECT * FROM turnos WHERE id = ?")
    .get(id) as { id: number; efectivo_inicial: number } | undefined;

  if (!turno) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  const porMetodo = db
    .prepare(
      `SELECT
         metodo_pago,
         COUNT(*) AS tickets,
         COALESCE(SUM(total), 0) AS total,
         COALESCE(SUM(propina), 0) AS propinas
       FROM ordenes
       WHERE turno_id = ?
       GROUP BY metodo_pago`
    )
    .all(id) as { metodo_pago: string; tickets: number; total: number; propinas: number }[];

  const efectivoRow = porMetodo.find((r) => r.metodo_pago === "efectivo");
  const tarjetaRow = porMetodo.find((r) => r.metodo_pago === "tarjeta");

  const total_efectivo = efectivoRow?.total ?? 0;
  const total_tarjeta = tarjetaRow?.total ?? 0;
  const propinas = (efectivoRow?.propinas ?? 0) + (tarjetaRow?.propinas ?? 0);
  const tickets = porMetodo.reduce((s, r) => s + r.tickets, 0);

  return NextResponse.json({
    tickets,
    total_efectivo,
    total_tarjeta,
    propinas,
    propinas_efectivo: efectivoRow?.propinas ?? 0,
    efectivo_esperado: turno.efectivo_inicial + total_efectivo,
  });
}
