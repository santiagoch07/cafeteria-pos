import { NextResponse } from "next/server";
import { getEmpresaIdFromSession } from "@/lib/auth-server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// PATCH: renombrar o cambiar activo
// es_base_id=true → id viene de tipos_gasto (base puro, crear override via upsert)
// es_base_id=false → id viene de tipos_gasto_empresa (override o custom, update directo)
export async function PATCH(request: Request, { params }: Params) {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const { nombre, activo, es_base_id } = await request.json();
  const supabase = getSupabase();

  if (es_base_id) {
    const upsertData: Record<string, unknown> = { empresa_id: empresaId, tipo_base_id: params.id };
    if (nombre !== undefined) upsertData.nombre_custom = nombre;
    if (activo !== undefined) upsertData.activo = activo;

    const { data, error: dbError } = await supabase
      .from("tipos_gasto_empresa")
      .upsert(upsertData, { onConflict: "empresa_id,tipo_base_id" })
      .select()
      .single();

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json(data);
  } else {
    const updateData: Record<string, unknown> = {};
    if (nombre !== undefined) updateData.nombre_custom = nombre;
    if (activo !== undefined) updateData.activo = activo;

    const { data, error: dbError } = await supabase
      .from("tipos_gasto_empresa")
      .update(updateData)
      .eq("id", params.id)
      .eq("empresa_id", empresaId)
      .select()
      .single();

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json(data);
  }
}

// DELETE: solo para custom o overrides — nunca para tipos base puros
export async function DELETE(_request: Request, { params }: Params) {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const supabase = getSupabase();

  const { count } = await supabase
    .from("gastos_mensuales")
    .select("id", { count: "exact", head: true })
    .eq("tipo_gasto_empresa_id", params.id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: hay gastos capturados con esta categoría. Desactívala en su lugar." },
      { status: 400 }
    );
  }

  const { error: dbError } = await supabase
    .from("tipos_gasto_empresa")
    .delete()
    .eq("id", params.id)
    .eq("empresa_id", empresaId);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
