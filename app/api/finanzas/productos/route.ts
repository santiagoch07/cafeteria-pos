import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getEmpresaIdFromSession } from "@/lib/auth-server";
import type { ProductoRanking } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function rangoMes(mes: number, anio: number) {
  const m = String(mes).padStart(2, "0");
  const inicio = `${anio}-${m}-01T06:00:00.000Z`;
  const fin =
    mes === 12
      ? `${anio + 1}-01-01T06:00:00.000Z`
      : `${anio}-${String(mes + 1).padStart(2, "0")}-01T06:00:00.000Z`;
  return { inicio, fin };
}

type RawOrden = {
  id: string;
  items: Array<{
    cantidad: number;
    producto: {
      id: string;
      nombre: string;
      precio: number;
      costo: number | null;
      categoria: { nombre: string } | null;
    } | null;
  }>;
};

type ProductAccum = {
  producto_id: string;
  nombre: string;
  categoria_nombre: string | null;
  precio: number;
  costo: number;
  unidades: number;
  costo_no_capturado: boolean;
};

export async function GET(request: Request) {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);

  const ahora = new Date();
  const mesRaw = searchParams.get("mes");
  const anioRaw = searchParams.get("anio");
  const mes = mesRaw ? parseInt(mesRaw) : ahora.getMonth() + 1;
  const anio = anioRaw ? parseInt(anioRaw) : ahora.getFullYear();

  if (isNaN(mes) || isNaN(anio) || mes < 1 || mes > 12) {
    return NextResponse.json({ error: "mes y anio inválidos" }, { status: 400 });
  }

  const rango = rangoMes(mes, anio);

  const { data: ordenes, error: e1 } = await supabase
    .from("ordenes")
    .select(
      "id, items:orden_items(cantidad, producto:productos(id, nombre, precio, costo, categoria:categorias(nombre)))"
    )
    .eq("empresa_id", empresaId)
    .gte("fecha", rango.inicio)
    .lt("fecha", rango.fin);

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const productoMap = new Map<string, ProductAccum>();

  for (const orden of (ordenes ?? []) as unknown as RawOrden[]) {
    for (const item of orden.items ?? []) {
      const prod = item.producto;
      if (!prod) continue;

      const existing = productoMap.get(prod.id);
      if (existing) {
        existing.unidades += item.cantidad;
      } else {
        const costoCapturado = prod.costo !== null && prod.costo > 0;
        productoMap.set(prod.id, {
          producto_id: prod.id,
          nombre: prod.nombre,
          categoria_nombre: prod.categoria?.nombre ?? null,
          precio: prod.precio,
          costo: costoCapturado ? prod.costo! : 0,
          unidades: item.cantidad,
          costo_no_capturado: !costoCapturado,
        });
      }
    }
  }

  if (productoMap.size === 0) {
    return NextResponse.json([]);
  }

  const productos = Array.from(productoMap.values()).map((p) => {
    const margen_unitario = p.precio - p.costo;
    const margen_porcentaje = p.costo_no_capturado
      ? 100
      : p.precio > 0
      ? Math.round((margen_unitario / p.precio) * 1000) / 10
      : 0;
    const ingreso_total = p.unidades * p.precio;
    const ganancia_total = p.unidades * margen_unitario;
    return { ...p, margen_unitario, margen_porcentaje, ingreso_total, ganancia_total };
  });

  const total_ganancia = productos.reduce((s, p) => s + p.ganancia_total, 0);

  const result: ProductoRanking[] = productos
    .sort((a, b) => b.ganancia_total - a.ganancia_total)
    .map((p) => ({
      producto_id: p.producto_id,
      nombre: p.nombre,
      categoria_nombre: p.categoria_nombre,
      precio: p.precio,
      costo: p.costo,
      margen_unitario: p.margen_unitario,
      margen_porcentaje: p.margen_porcentaje,
      unidades_vendidas: p.unidades,
      ingreso_total: p.ingreso_total,
      ganancia_total: p.ganancia_total,
      participacion_ganancia:
        total_ganancia > 0
          ? Math.round((p.ganancia_total / total_ganancia) * 1000) / 10
          : 0,
      ...(p.costo_no_capturado ? { costo_no_capturado: true as const } : {}),
    }));

  return NextResponse.json(result);
}
