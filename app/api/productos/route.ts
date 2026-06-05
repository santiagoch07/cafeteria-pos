import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { pesosToCentavos } from "@/lib/format";
import { getEmpresaIdFromSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CategoriaEmbed = { id: string; nombre: string } | null;

export async function GET() {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const supabase = getSupabase();
  const { data, error: dbError } = await supabase
    .from("productos")
    .select("*, categoria:categorias(id, nombre)")
    .eq("empresa_id", empresaId)
    .order("nombre", { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const productos = (data ?? []).map(({ categoria, ...p }) => ({
    ...p,
    categoria_nombre: (categoria as CategoriaEmbed)?.nombre ?? null,
  }));

  return NextResponse.json(productos);
}

export async function POST(request: Request) {
  const { empresaId, error } = await getEmpresaIdFromSession();
  if (error) return error;

  const supabase = getSupabase();
  const body = await request.json();
  const { nombre, precio_pesos, costo_pesos = 0, categoria_id, disponible = true } = body;

  if (!nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }
  if (typeof precio_pesos !== "number" || precio_pesos < 0) {
    return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("productos")
    .insert({
      nombre: nombre.trim(),
      precio: pesosToCentavos(precio_pesos),
      costo: pesosToCentavos(costo_pesos),
      categoria_id: categoria_id ?? null,
      disponible,
      empresa_id: empresaId,
    })
    .select("*, categoria:categorias(id, nombre)")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const { categoria, ...rest } = data as typeof data & { categoria: CategoriaEmbed };
  return NextResponse.json(
    { ...rest, categoria_nombre: categoria?.nombre ?? null },
    { status: 201 }
  );
}
