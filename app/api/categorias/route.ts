import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const categorias = db
    .prepare("SELECT * FROM categorias ORDER BY orden ASC, nombre ASC")
    .all();
  return NextResponse.json(categorias);
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { nombre, orden = 0 } = body;

  if (!nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  try {
    const result = db
      .prepare("INSERT INTO categorias (nombre, orden) VALUES (?, ?)")
      .run(nombre.trim(), orden);
    const categoria = db
      .prepare("SELECT * FROM categorias WHERE id = ?")
      .get(result.lastInsertRowid);
    return NextResponse.json(categoria, { status: 201 });
  } catch {
    return NextResponse.json({ error: "La categoría ya existe" }, { status: 409 });
  }
}
