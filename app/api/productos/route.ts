import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { pesosToCentavos } from "@/lib/format";

export async function GET() {
  const db = getDb();
  const productos = db
    .prepare(
      `SELECT p.*, c.nombre AS categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       ORDER BY c.orden ASC, c.nombre ASC, p.nombre ASC`
    )
    .all();
  return NextResponse.json(productos);
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { nombre, precio_pesos, categoria_id, disponible = true } = body;

  if (!nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }
  if (typeof precio_pesos !== "number" || precio_pesos < 0) {
    return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
  }

  const precio = pesosToCentavos(precio_pesos);
  const result = db
    .prepare(
      "INSERT INTO productos (nombre, precio, categoria_id, disponible) VALUES (?, ?, ?, ?)"
    )
    .run(nombre.trim(), precio, categoria_id ?? null, disponible ? 1 : 0);

  const producto = db
    .prepare(
      `SELECT p.*, c.nombre AS categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       WHERE p.id = ?`
    )
    .get(result.lastInsertRowid);

  return NextResponse.json(producto, { status: 201 });
}
