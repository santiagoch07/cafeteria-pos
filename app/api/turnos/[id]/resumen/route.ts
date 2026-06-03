import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const supabase = getSupabase();
  const { id } = params;

  const { data: turno, error: turnoError } = await supabase
    .from("turnos")
    .select("id, efectivo_inicial")
    .eq("id", id)
    .maybeSingle();

  if (turnoError) return NextResponse.json({ error: turnoError.message }, { status: 500 });
  if (!turno) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });

  const { data: ordenes, error: ordenesError } = await supabase
    .from("ordenes")
    .select("metodo_pago, total, propina")
    .eq("turno_id", id);

  if (ordenesError) return NextResponse.json({ error: ordenesError.message }, { status: 500 });

  const rows = ordenes ?? [];
  const efectivoRows = rows.filter((o) => o.metodo_pago === "efectivo");
  const tarjetaRows = rows.filter((o) => o.metodo_pago === "tarjeta");

  const total_efectivo = efectivoRows.reduce((s, o) => s + o.total, 0);
  const total_tarjeta = tarjetaRows.reduce((s, o) => s + o.total, 0);
  const propinas_efectivo = efectivoRows.reduce((s, o) => s + o.propina, 0);
  const propinas_tarjeta = tarjetaRows.reduce((s, o) => s + o.propina, 0);

  return NextResponse.json({
    tickets: rows.length,
    total_efectivo,
    total_tarjeta,
    propinas: propinas_efectivo + propinas_tarjeta,
    propinas_efectivo,
    efectivo_esperado: turno.efectivo_inicial + total_efectivo,
  });
}
