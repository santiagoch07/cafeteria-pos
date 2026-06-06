import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { pesosToCentavos } from "@/lib/format";
import { getEmpresaIdFromSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const mes  = parseInt(searchParams.get("mes")  ?? "");
  const anio = parseInt(searchParams.get("anio") ?? "");

  if (!mes || !anio) {
    return NextResponse.json({ error: "mes y anio son requeridos" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error: dbError } = await supabase
    .from("gastos_mensuales")
    .select("*, tipo_base:tipos_gasto(id, nombre, orden), tipo_custom:tipos_gasto_empresa(id, nombre_custom, orden_custom)")
    .eq("empresa_id", empresaId)
    .eq("mes", mes)
    .eq("año", anio)
    .order("created_at", { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const supabase = getSupabase();
  const body = await request.json();
  const { mes, año: anio, tipo_id, es_base, monto_pesos, notas } = body;

  if (!mes || !anio || !tipo_id) {
    return NextResponse.json({ error: "mes, año y tipo_id son requeridos" }, { status: 400 });
  }
  if (typeof monto_pesos !== "number" || monto_pesos < 0) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  const insertData: Record<string, unknown> = {
    mes,
    año: anio,
    monto: pesosToCentavos(monto_pesos),
    notas: notas?.trim() || null,
    empresa_id: empresaId,
  };

  if (es_base) {
    insertData.tipo_gasto_id = tipo_id;
    insertData.tipo_gasto_empresa_id = null;
  } else {
    insertData.tipo_gasto_id = null;
    insertData.tipo_gasto_empresa_id = tipo_id;
  }

  const { data, error: dbError } = await supabase
    .from("gastos_mensuales")
    .insert(insertData)
    .select("*")
    .single();

  if (dbError) {
    if (dbError.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un gasto de este tipo este mes. Edítalo en lugar de crear uno nuevo." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
