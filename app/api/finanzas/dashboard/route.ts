import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getEmpresaIdFromSession } from "@/lib/auth-server";
import { getTiposGastoVisibles } from "@/lib/tipos-gasto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MESES_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function rangoMes(mes: number, anio: number) {
  const m = String(mes).padStart(2, "0");
  const inicio = `${anio}-${m}-01T06:00:00.000Z`;
  const fin = mes === 12
    ? `${anio + 1}-01-01T06:00:00.000Z`
    : `${anio}-${String(mes + 1).padStart(2, "0")}-01T06:00:00.000Z`;
  return { inicio, fin };
}

function diasEnMes(mes: number, anio: number) {
  return new Date(anio, mes, 0).getDate();
}

function mesPrevio(mes: number, anio: number) {
  return mes === 1 ? { mes: 12, anio: anio - 1 } : { mes: mes - 1, anio };
}

type ItemRow     = { cantidad: number; producto: { costo: number } | null };
type OrdenRow    = { total: number; fecha: string; items: ItemRow[] };
type OrdenPrevRow = { total: number; items: ItemRow[] };
type GastoRow    = { monto: number; tipo_gasto_id: string | null; tipo_gasto_empresa_id: string | null };

function sumarOrden(ordenes: OrdenRow[] | OrdenPrevRow[]) {
  let ventas = 0, costo = 0;
  for (const o of ordenes) {
    ventas += o.total;
    for (const item of o.items ?? []) costo += item.cantidad * (item.producto?.costo ?? 0);
  }
  return { ventas, costo };
}

function evaluacion(margen: number, ventas: number) {
  if (ventas === 0) return { estado: "precaucion" as const, mensaje: "Sin ventas registradas en este periodo." };
  if (margen >= 25) return { estado: "excelente" as const, mensaje: "Margen excelente. Tu negocio es muy rentable este mes." };
  if (margen >= 15) return { estado: "bueno" as const, mensaje: "Margen sano. Estás en rango ideal para una cafetería." };
  if (margen >= 5)  return { estado: "precaucion" as const, mensaje: "Margen ajustado. Revisa gastos fijos o estructura de precios." };
  return { estado: "critico" as const, mensaje: "Margen muy bajo. Necesitas acción urgente sobre costos o ventas." };
}

export async function GET(request: Request) {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const mes  = parseInt(searchParams.get("mes")  ?? "");
  const anio = parseInt(searchParams.get("anio") ?? "");

  if (!mes || !anio || mes < 1 || mes > 12) {
    return NextResponse.json({ error: "mes y anio son requeridos" }, { status: 400 });
  }

  const rango     = rangoMes(mes, anio);
  const prev      = mesPrevio(mes, anio);
  const rangoPrev = rangoMes(prev.mes, prev.anio);

  // Tipos de gasto visibles — resuelve nombres base + overrides + custom en paralelo con las queries
  const [
    tipos,
    [{ data: ordenes, error: e1 }, { data: gastos, error: e2 }, { data: ordenesPrev, error: e3 }, { data: gastosPrev, error: e4 }],
  ] = await Promise.all([
    getTiposGastoVisibles(empresaId),
    Promise.all([
      supabase.from("ordenes")
        .select("total, fecha, items:orden_items(cantidad, producto:productos(costo))")
        .eq("empresa_id", empresaId)
        .gte("fecha", rango.inicio).lt("fecha", rango.fin),
      supabase.from("gastos_mensuales")
        .select("monto, tipo_gasto_id, tipo_gasto_empresa_id")
        .eq("empresa_id", empresaId)
        .eq("mes", mes).eq("año", anio),
      supabase.from("ordenes")
        .select("total, items:orden_items(cantidad, producto:productos(costo))")
        .eq("empresa_id", empresaId)
        .gte("fecha", rangoPrev.inicio).lt("fecha", rangoPrev.fin),
      supabase.from("gastos_mensuales")
        .select("monto")
        .eq("empresa_id", empresaId)
        .eq("mes", prev.mes).eq("año", prev.anio),
    ]),
  ]);

  // Mapas: base_tipo_id → nombre, empresa_tipo_id → nombre
  // tipo_base_id cubre la clave que usa un gasto con tipo_gasto_id cuando ese tipo fue renombrado
  const baseNombreMap = new Map<string, string>();
  const customNombreMap = new Map<string, string>();
  for (const t of tipos) {
    if (t.tipo_gasto_id) baseNombreMap.set(t.tipo_gasto_id, t.nombre);
    if (t.tipo_base_id)  baseNombreMap.set(t.tipo_base_id, t.nombre);
    if (t.tipo_gasto_empresa_id && !t.tipo_base_id) customNombreMap.set(t.tipo_gasto_empresa_id, t.nombre);
  }

  function resolverNombre(g: GastoRow): string {
    if (g.tipo_gasto_id) return baseNombreMap.get(g.tipo_gasto_id) ?? "Sin categoría";
    if (g.tipo_gasto_empresa_id) return customNombreMap.get(g.tipo_gasto_empresa_id) ?? "Sin categoría";
    return "Sin categoría";
  }

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });
  if (e4) return NextResponse.json({ error: e4.message }, { status: 500 });

  // ── Métricas del mes actual ─────────────────────────────
  const { ventas: ventas_totales, costo: costo_variable } = sumarOrden((ordenes ?? []) as unknown as OrdenRow[]);
  const ventasPorDia = new Map<number, number>();
  for (const o of (ordenes ?? []) as unknown as OrdenRow[]) {
    const fechaLocal = new Date(new Date(o.fecha).getTime() - 6 * 3600000);
    const dia = fechaLocal.getUTCDate();
    ventasPorDia.set(dia, (ventasPorDia.get(dia) ?? 0) + o.total);
  }

  const margen_contribucion = ventas_totales - costo_variable;
  const gastos_fijos = ((gastos ?? []) as unknown as GastoRow[]).reduce((s, g) => s + g.monto, 0);
  const utilidad_neta = margen_contribucion - gastos_fijos;
  const margen_porcentaje = ventas_totales > 0
    ? Math.round((utilidad_neta / ventas_totales) * 1000) / 10
    : 0;

  // ── Punto de equilibrio ─────────────────────────────────
  const mc_ratio = ventas_totales > 0 ? margen_contribucion / ventas_totales : 0;
  const pe_monto = ventas_totales > 0
    ? (mc_ratio > 0 ? Math.round(gastos_fijos / mc_ratio) : gastos_fijos)
    : gastos_fijos;

  const totalDias = diasEnMes(mes, anio);
  const ventas_acumuladas_por_dia: { dia: number; ventas_acumuladas: number; punto_equilibrio_linea: number }[] = [];
  let acum = 0;
  let dias_para_alcanzar: number | null = null;

  for (let dia = 1; dia <= totalDias; dia++) {
    acum += ventasPorDia.get(dia) ?? 0;
    if (dias_para_alcanzar === null && pe_monto > 0 && acum >= pe_monto) dias_para_alcanzar = dia;
    ventas_acumuladas_por_dia.push({ dia, ventas_acumuladas: acum, punto_equilibrio_linea: pe_monto });
  }

  // ── Comparativo mes anterior ────────────────────────────
  const { ventas: ventas_prev, costo: costo_prev } = sumarOrden((ordenesPrev ?? []) as unknown as OrdenPrevRow[]);
  const gastos_prev = ((gastosPrev ?? []) as unknown as { monto: number }[]).reduce((s, g) => s + g.monto, 0);
  const hayDatosPrev = ventas_prev > 0 || gastos_prev > 0;
  const utilidad_prev = (ventas_prev - costo_prev) - gastos_prev;
  const utilidad_neta_anterior = hayDatosPrev ? utilidad_prev : null;
  const cambio_porcentaje = (utilidad_neta_anterior !== null && utilidad_neta_anterior !== 0)
    ? Math.round((utilidad_neta - utilidad_neta_anterior) / Math.abs(utilidad_neta_anterior) * 100)
    : null;

  // ── Gastos por categoría ────────────────────────────────
  const gastos_por_categoria = ((gastos ?? []) as unknown as GastoRow[])
    .filter(g => g.monto > 0)
    .sort((a, b) => b.monto - a.monto)
    .map(g => ({
      tipo_nombre: resolverNombre(g),
      monto: g.monto,
      porcentaje: gastos_fijos > 0 ? Math.round(g.monto / gastos_fijos * 100) : 0,
    }));

  return NextResponse.json({
    periodo: { mes, año: anio, nombre_mes: `${MESES_ES[mes - 1]} ${anio}` },
    kpis: { ventas_totales, costo_variable, margen_contribucion, gastos_fijos, utilidad_neta, margen_porcentaje },
    punto_equilibrio: {
      monto_necesario: pe_monto,
      ya_alcanzado: pe_monto > 0 && ventas_totales >= pe_monto,
      dias_para_alcanzar,
      falta_por_vender: Math.max(0, pe_monto - ventas_totales),
    },
    ventas_acumuladas_por_dia,
    comparativo_mes_anterior: { utilidad_neta_anterior, cambio_porcentaje },
    gastos_por_categoria,
    evaluacion: evaluacion(margen_porcentaje, ventas_totales),
  });
}
