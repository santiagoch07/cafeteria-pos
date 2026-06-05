import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { pesosToCentavos } from "@/lib/format";
import { getEmpresaIdFromSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const supabase = getSupabase();

  const { data: abierto, error: checkError } = await supabase
    .from("turnos")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("estado", "abierto")
    .limit(1)
    .maybeSingle();

  if (checkError) {
    return NextResponse.json({ error: checkError.message }, { status: 500 });
  }
  if (abierto) {
    return NextResponse.json({ error: "Ya hay un turno abierto" }, { status: 409 });
  }

  const body = await request.json();
  const efectivo_inicial = pesosToCentavos(body.efectivo_inicial_pesos ?? 0);

  const { data, error: dbError } = await supabase
    .from("turnos")
    .insert({ efectivo_inicial, empresa_id: empresaId })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
