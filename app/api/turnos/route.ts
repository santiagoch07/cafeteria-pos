import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { pesosToCentavos } from "@/lib/format";

export async function POST(request: Request) {
  const db = getDb();

  // Solo puede haber un turno abierto a la vez
  const abierto = db
    .prepare("SELECT id FROM turnos WHERE estado = 'abierto' LIMIT 1")
    .get();
  if (abierto) {
    return NextResponse.json({ error: "Ya hay un turno abierto" }, { status: 409 });
  }

  const body = await request.json();
  const efectivo_inicial = pesosToCentavos(body.efectivo_inicial_pesos ?? 0);

  const result = db
    .prepare("INSERT INTO turnos (efectivo_inicial) VALUES (?)")
    .run(efectivo_inicial);

  const turno = db
    .prepare("SELECT * FROM turnos WHERE id = ?")
    .get(result.lastInsertRowid);

  return NextResponse.json(turno, { status: 201 });
}
