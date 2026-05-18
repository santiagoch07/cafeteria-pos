import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { pesosToCentavos } from "@/lib/format";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  const db = getDb();
  const id = parseInt(params.id, 10);
  const body = await request.json();

  const existing = db.prepare("SELECT * FROM productos WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.nombre !== undefined) {
    fields.push("nombre = ?");
    values.push(body.nombre.trim());
  }
  if (body.precio_pesos !== undefined) {
    fields.push("precio = ?");
    values.push(pesosToCentavos(body.precio_pesos));
  }
  if (body.categoria_id !== undefined) {
    fields.push("categoria_id = ?");
    values.push(body.categoria_id);
  }
  if (body.disponible !== undefined) {
    fields.push("disponible = ?");
    values.push(body.disponible ? 1 : 0);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
  }

  values.push(id);
  db.prepare(`UPDATE productos SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  const producto = db
    .prepare(
      `SELECT p.*, c.nombre AS categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       WHERE p.id = ?`
    )
    .get(id);

  return NextResponse.json(producto);
}

export async function DELETE(_request: Request, { params }: Params) {
  const db = getDb();
  const id = parseInt(params.id, 10);

  const existing = db.prepare("SELECT id FROM productos WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  db.prepare("DELETE FROM productos WHERE id = ?").run(id);
  return new NextResponse(null, { status: 204 });
}
