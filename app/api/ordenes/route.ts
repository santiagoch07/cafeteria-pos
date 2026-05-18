import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { pesosToCentavos } from "@/lib/format";

type ItemInput = {
  producto_id: number;
  cantidad: number;
};

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const { items, propina_pesos = 0, metodo_pago } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "La orden debe tener al menos un ítem" }, { status: 400 });
  }
  if (metodo_pago !== "efectivo" && metodo_pago !== "tarjeta") {
    return NextResponse.json(
      { error: "metodo_pago debe ser 'efectivo' o 'tarjeta'" },
      { status: 400 }
    );
  }

  // Calcular total en backend a partir de precios reales en DB
  const placeholders = items.map(() => "?").join(",");
  const ids = items.map((i: ItemInput) => i.producto_id);
  const productosDb = db
    .prepare(
      `SELECT id, precio, disponible FROM productos WHERE id IN (${placeholders})`
    )
    .all(...ids) as { id: number; precio: number; disponible: number }[];

  const precioMap = new Map(productosDb.map((p) => [p.id, p]));

  for (const item of items as ItemInput[]) {
    const prod = precioMap.get(item.producto_id);
    if (!prod) {
      return NextResponse.json(
        { error: `Producto ${item.producto_id} no encontrado` },
        { status: 400 }
      );
    }
    if (!prod.disponible) {
      return NextResponse.json(
        { error: `Producto ${item.producto_id} no está disponible` },
        { status: 400 }
      );
    }
    if (!Number.isInteger(item.cantidad) || item.cantidad < 1) {
      return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
    }
  }

  const subtotal = (items as ItemInput[]).reduce((acc, item) => {
    const precio = precioMap.get(item.producto_id)!.precio;
    return acc + precio * item.cantidad;
  }, 0);

  const propina = pesosToCentavos(propina_pesos);
  const total = subtotal + propina;

  const crearOrden = db.transaction(() => {
    const ordenResult = db
      .prepare(
        "INSERT INTO ordenes (total, propina, metodo_pago) VALUES (?, ?, ?)"
      )
      .run(total, propina, metodo_pago);

    const ordenId = ordenResult.lastInsertRowid;

    for (const item of items as ItemInput[]) {
      const precio_unitario = precioMap.get(item.producto_id)!.precio;
      db.prepare(
        "INSERT INTO orden_items (orden_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)"
      ).run(ordenId, item.producto_id, item.cantidad, precio_unitario);
    }

    return db.prepare("SELECT * FROM ordenes WHERE id = ?").get(ordenId);
  });

  const orden = crearOrden();
  return NextResponse.json(orden, { status: 201 });
}
