import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { pesosToCentavos } from "@/lib/format";
import { getEmpresaIdFromSession } from "@/lib/auth-server";

type Params = { params: { id: string } };
type CategoriaEmbed = { id: string; nombre: string } | null;

export async function PATCH(request: Request, { params }: Params) {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const supabase = getSupabase();
  const { id } = params;
  const body = await request.json();

  const { data: existing, error: fetchError } = await supabase
    .from("productos")
    .select("id")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (body.nombre !== undefined) updates.nombre = body.nombre.trim();
  if (body.precio_pesos !== undefined) updates.precio = pesosToCentavos(body.precio_pesos);
  if (body.costo_pesos !== undefined) updates.costo = pesosToCentavos(body.costo_pesos);
  if (body.categoria_id !== undefined) updates.categoria_id = body.categoria_id;
  if (body.disponible !== undefined) updates.disponible = body.disponible;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("productos")
    .update(updates)
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select("*, categoria:categorias(id, nombre)")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const { categoria, ...rest } = data as typeof data & { categoria: CategoriaEmbed };
  return NextResponse.json({ ...rest, categoria_nombre: categoria?.nombre ?? null });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const supabase = getSupabase();
  const { id } = params;

  const { data: existing, error: fetchError } = await supabase
    .from("productos")
    .select("id")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const { error: dbError } = await supabase
    .from("productos")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
