import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getEmpresaIdFromSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const supabase = getSupabase();
  const { data, error: dbError } = await supabase
    .from("turnos")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("estado", "abierto")
    .order("fecha_apertura", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}
