import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { pesosToCentavos } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CategoriaEmbed = { id: string; nombre: string } | null;

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("productos")
    .select("*, categoria:categorias(id, nombre)")
    .order("nombre", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const productos = (data ?? []).map(({ categoria, ...p }) => ({
    ...p,
    categoria_nombre: (categoria as CategoriaEmbed)?.nombre ?? null,
  }));

  return NextResponse.json(productos);
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();
  const { nombre, precio_pesos, categoria_id, disponible = true } = body;

  if (!nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }
  if (typeof precio_pesos !== "number" || precio_pesos < 0) {
    return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("productos")
    .insert({
      nombre: nombre.trim(),
      precio: pesosToCentavos(precio_pesos),
      categoria_id: categoria_id ?? null,
      disponible,
    })
    .select("*, categoria:categorias(id, nombre)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { categoria, ...rest } = data as typeof data & { categoria: CategoriaEmbed };
  return NextResponse.json(
    { ...rest, categoria_nombre: categoria?.nombre ?? null },
    { status: 201 }
  );
}
