import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const { user_id, email, nombre_dueno, nombre_negocio } = body;

  if (!user_id || !email || !nombre_negocio) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Generar slug único a partir del nombre del negocio
  const slug =
    nombre_negocio
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 6);

  // Crear empresa
  const { data: empresa, error: empresaError } = await supabase
    .from("empresas")
    .insert({ nombre: nombre_negocio, slug })
    .select()
    .single();

  if (empresaError) {
    return NextResponse.json({ error: empresaError.message }, { status: 500 });
  }

  // Crear usuario relacionado
  const { error: usuarioError } = await supabase
    .from("usuarios")
    .insert({
      id: user_id,
      empresa_id: empresa.id,
      email,
      nombre: nombre_dueno ?? null,
    });

  if (usuarioError) {
    // Rollback: limpiar la empresa si el usuario no se pudo crear
    await supabase.from("empresas").delete().eq("id", empresa.id);
    return NextResponse.json({ error: usuarioError.message }, { status: 500 });
  }

  return NextResponse.json({ empresa, ok: true });
}
