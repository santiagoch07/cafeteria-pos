import { NextResponse } from "next/server";
import { requireRol, getUsuarioActual } from "@/lib/auth-server";
import { getSupabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const errorResponse = await requireRol(["dueno"]);
  if (errorResponse) return errorResponse;

  const usuario = await getUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, email, nombre, rol, created_at")
    .eq("empresa_id", usuario.empresa_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const errorResponse = await requireRol(["dueno"]);
  if (errorResponse) return errorResponse;

  const usuario = await getUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { email, nombre, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres" },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
  if (!authData.user) return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });

  const { error: usuarioError } = await admin.from("usuarios").insert({
    id: authData.user.id,
    empresa_id: usuario.empresa_id,
    email,
    nombre: nombre?.trim() || null,
    rol: "cajero",
  });

  if (usuarioError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: usuarioError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    usuario: { id: authData.user.id, email, nombre: nombre?.trim() || null, rol: "cajero" },
  });
}
