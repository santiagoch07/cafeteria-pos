import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { pesosToCentavos } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const supabase = getSupabase();

  const { data: abierto, error: checkError } = await supabase
    .from("turnos")
    .select("id")
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

  const { data, error } = await supabase
    .from("turnos")
    .insert({ efectivo_inicial })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
