import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { pesosToCentavos } from "@/lib/format";
import { getEmpresaIdFromSession } from "@/lib/auth-server";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const supabase = getSupabase();
  const body = await request.json();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.monto_pesos !== undefined) updates.monto = pesosToCentavos(body.monto_pesos);
  if (body.notas !== undefined) updates.notas = body.notas?.trim() || null;

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("gastos_mensuales")
    .update(updates)
    .eq("id", params.id)
    .eq("empresa_id", empresaId)
    .select("*, tipo:tipos_gasto(id, nombre, orden)")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const supabase = getSupabase();
  const { error: dbError } = await supabase
    .from("gastos_mensuales")
    .delete()
    .eq("id", params.id)
    .eq("empresa_id", empresaId);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
