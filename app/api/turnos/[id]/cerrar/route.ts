import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { pesosToCentavos } from "@/lib/format";
import { getEmpresaIdFromSession } from "@/lib/auth-server";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const supabase = getSupabase();
  const { id } = params;

  const { data: turno, error: fetchError } = await supabase
    .from("turnos")
    .select("id, efectivo_inicial")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .eq("estado", "abierto")
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!turno) {
    return NextResponse.json({ error: "Turno no encontrado o ya cerrado" }, { status: 404 });
  }

  const body = await request.json();
  const efectivo_final_real = pesosToCentavos(body.efectivo_real_pesos ?? 0);
  const notas: string | null = body.notas ?? null;

  // Sumar ventas en efectivo (total + propina) del turno de esta empresa
  const { data: ordenesEfectivo, error: ordenesError } = await supabase
    .from("ordenes")
    .select("total, propina")
    .eq("turno_id", id)
    .eq("empresa_id", empresaId)
    .eq("metodo_pago", "efectivo");

  if (ordenesError) return NextResponse.json({ error: ordenesError.message }, { status: 500 });

  const totalEfectivo = (ordenesEfectivo ?? []).reduce(
    (sum, o) => sum + o.total + o.propina,
    0
  );

  const efectivo_final_sistema = turno.efectivo_inicial + totalEfectivo;
  const diferencia = efectivo_final_real - efectivo_final_sistema;

  const { data: turnoActualizado, error: updateError } = await supabase
    .from("turnos")
    .update({
      estado: "cerrado",
      fecha_cierre: new Date().toISOString(),
      efectivo_final_sistema,
      efectivo_final_real,
      diferencia,
      notas,
    })
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json(turnoActualizado);
}
