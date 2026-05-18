import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { pesosToCentavos } from "@/lib/format";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  const db = getDb();
  const id = parseInt(params.id, 10);

  const turno = db
    .prepare("SELECT * FROM turnos WHERE id = ? AND estado = 'abierto'")
    .get(id) as {
      id: number;
      efectivo_inicial: number;
      estado: string;
    } | undefined;

  if (!turno) {
    return NextResponse.json(
      { error: "Turno no encontrado o ya cerrado" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const efectivo_final_real = pesosToCentavos(body.efectivo_real_pesos ?? 0);
  const notas = body.notas ?? null;

  // Calcular efectivo esperado: inicial + todas las ventas en efectivo de este turno
  const resEfectivo = db
    .prepare(
      `SELECT COALESCE(SUM(total), 0) AS total_efectivo
       FROM ordenes
       WHERE turno_id = ? AND metodo_pago = 'efectivo'`
    )
    .get(id) as { total_efectivo: number };

  const efectivo_final_sistema = turno.efectivo_inicial + resEfectivo.total_efectivo;
  const diferencia = efectivo_final_real - efectivo_final_sistema;

  db.prepare(
    `UPDATE turnos SET
      estado = 'cerrado',
      fecha_cierre = datetime('now','localtime'),
      efectivo_final_sistema = ?,
      efectivo_final_real = ?,
      diferencia = ?,
      notas = ?
     WHERE id = ?`
  ).run(efectivo_final_sistema, efectivo_final_real, diferencia, notas, id);

  const turnoActualizado = db
    .prepare("SELECT * FROM turnos WHERE id = ?")
    .get(id);

  return NextResponse.json(turnoActualizado);
}
