import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { pesosToCentavos } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mes  = parseInt(searchParams.get("mes")   ?? "");
  const anio = parseInt(searchParams.get("anio")  ?? "");

  if (!mes || !anio) {
    return NextResponse.json({ error: "mes y anio son requeridos" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("gastos_mensuales")
    .select("*, tipo:tipos_gasto(id, nombre, orden)")
    .eq("mes", mes)
    .eq("año", anio)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();
  const { mes, año: anio, tipo_gasto_id, monto_pesos, notas } = body;

  if (!mes || !anio || !tipo_gasto_id) {
    return NextResponse.json({ error: "mes, año y tipo_gasto_id son requeridos" }, { status: 400 });
  }
  if (typeof monto_pesos !== "number" || monto_pesos < 0) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("gastos_mensuales")
    .insert({
      mes,
      año: anio,
      tipo_gasto_id,
      monto: pesosToCentavos(monto_pesos),
      notas: notas?.trim() || null,
    })
    .select("*, tipo:tipos_gasto(id, nombre, orden)")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un gasto de este tipo este mes. Edítalo en lugar de crear uno nuevo." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
