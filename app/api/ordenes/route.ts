import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { pesosToCentavos } from "@/lib/format";
import { getEmpresaIdFromSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ItemInput = {
  producto_id: string;
  cantidad: number;
};

export async function POST(request: Request) {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const supabase = getSupabase();
  const body = await request.json();
  const { items, propina_pesos = 0, metodo_pago, turno_id = null } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "La orden debe tener al menos un ítem" },
      { status: 400 }
    );
  }
  if (metodo_pago !== "efectivo" && metodo_pago !== "tarjeta") {
    return NextResponse.json(
      { error: "metodo_pago debe ser 'efectivo' o 'tarjeta'" },
      { status: 400 }
    );
  }

  // Validar que el turno_id pertenezca a esta empresa
  if (turno_id) {
    const { data: turno, error: turnoError } = await supabase
      .from("turnos")
      .select("id")
      .eq("id", turno_id)
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (turnoError) return NextResponse.json({ error: turnoError.message }, { status: 500 });
    if (!turno) {
      return NextResponse.json({ error: "Turno no válido" }, { status: 400 });
    }
  }

  // Validar precios y disponibilidad — solo productos de esta empresa
  const ids = Array.from(new Set((items as ItemInput[]).map((i) => i.producto_id)));
  const { data: productosDb, error: fetchError } = await supabase
    .from("productos")
    .select("id, precio, disponible")
    .eq("empresa_id", empresaId)
    .in("id", ids);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const precioMap = new Map((productosDb ?? []).map((p) => [p.id, p]));

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

  const subtotal = (items as ItemInput[]).reduce(
    (acc, item) => acc + precioMap.get(item.producto_id)!.precio * item.cantidad,
    0
  );
  const propina = pesosToCentavos(propina_pesos);
  const total = subtotal + propina;

  // Insertar orden
  const { data: orden, error: ordenError } = await supabase
    .from("ordenes")
    .insert({ total, propina, metodo_pago, turno_id, empresa_id: empresaId })
    .select()
    .single();

  if (ordenError) return NextResponse.json({ error: ordenError.message }, { status: 500 });

  // Insertar items en batch
  const itemsToInsert = (items as ItemInput[]).map((item) => ({
    orden_id: orden.id,
    producto_id: item.producto_id,
    cantidad: item.cantidad,
    precio_unitario: precioMap.get(item.producto_id)!.precio,
    empresa_id: empresaId,
  }));

  const { data: itemsInserted, error: itemsError } = await supabase
    .from("orden_items")
    .insert(itemsToInsert)
    .select();

  if (itemsError) {
    // Rollback manual: limpiar orden huérfana
    await supabase.from("ordenes").delete().eq("id", orden.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ ...orden, items: itemsInserted }, { status: 201 });
}
