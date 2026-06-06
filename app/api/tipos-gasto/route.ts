import { NextResponse } from "next/server";
import { getEmpresaIdFromSession } from "@/lib/auth-server";
import { getTiposGastoVisibles } from "@/lib/tipos-gasto";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const tipos = await getTiposGastoVisibles(empresaId);
  return NextResponse.json(tipos);
}

export async function POST(request: Request) {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const { nombre } = await request.json();
  if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error: dbError } = await supabase
    .from("tipos_gasto_empresa")
    .insert({
      empresa_id: empresaId,
      tipo_base_id: null,
      nombre_custom: nombre.trim(),
      activo: true,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
