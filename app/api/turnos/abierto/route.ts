import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const turno = db
    .prepare("SELECT * FROM turnos WHERE estado = 'abierto' ORDER BY id DESC LIMIT 1")
    .get();
  return NextResponse.json(turno ?? null);
}
