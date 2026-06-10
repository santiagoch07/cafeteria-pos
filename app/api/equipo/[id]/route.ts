import { NextResponse } from "next/server";
import { requireRol, getUsuarioActual } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function DELETE(_request: Request, { params }: Params) {
  const errorResponse = await requireRol(["dueno"]);
  if (errorResponse) return errorResponse;

  const usuario = await getUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  if (params.id === usuario.id) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: target } = await admin
    .from("usuarios")
    .select("id, empresa_id, rol")
    .eq("id", params.id)
    .single();

  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (target.empresa_id !== usuario.empresa_id) {
    return NextResponse.json({ error: "No tienes permiso" }, { status: 403 });
  }

  if (target.rol === "dueno") {
    const { count } = await admin
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", usuario.empresa_id)
      .eq("rol", "dueno");

    if (count !== null && count <= 1) {
      return NextResponse.json(
        { error: "No puedes eliminar al último dueño de la empresa" },
        { status: 400 }
      );
    }
  }

  const { error: authError } = await admin.auth.admin.deleteUser(params.id);
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  // Por si no hay cascada ON DELETE en la tabla usuarios
  await admin.from("usuarios").delete().eq("id", params.id);

  return NextResponse.json({ ok: true });
}
