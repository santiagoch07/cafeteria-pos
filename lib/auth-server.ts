import { getSupabaseServer } from "./supabase-server";
import { NextResponse } from "next/server";

/**
 * Obtiene datos del usuario logueado: nombre, email, empresa.
 * Retorna null si no hay sesión (o si el usuario no tiene fila en usuarios).
 */
export async function getUsuarioActual() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, email, nombre, rol, empresa_id, empresa:empresas(id, nombre)")
    .eq("id", user.id)
    .single();

  return usuario ?? null;
}

export async function getRolFromSession(): Promise<"dueno" | "cajero" | null> {
  const usuario = await getUsuarioActual();
  if (!usuario) return null;
  return usuario.rol as "dueno" | "cajero";
}

export async function requireRol(rolesPermitidos: ("dueno" | "cajero")[]) {
  const rol = await getRolFromSession();
  if (!rol) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!rolesPermitidos.includes(rol)) {
    return NextResponse.json({ error: "Acceso restringido" }, { status: 403 });
  }
  return null;
}

type EmpresaOk  = { empresaId: string; error: null };
type EmpresaErr = { empresaId: null; error: NextResponse };

/**
 * Obtiene el empresa_id del usuario autenticado.
 * Usar en todas las API routes protegidas.
 *
 * Ejemplo:
 *   const { empresaId, error } = await getEmpresaIdFromSession();
 *   if (error) return error;
 */
export async function getEmpresaIdFromSession(): Promise<EmpresaOk | EmpresaErr> {
  const supabase = getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      empresaId: null,
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const { data: usuario, error: dbError } = await supabase
    .from("usuarios")
    .select("empresa_id")
    .eq("id", user.id)
    .single();

  if (dbError || !usuario) {
    return {
      empresaId: null,
      error: NextResponse.json({ error: "Usuario sin empresa asignada" }, { status: 403 }),
    };
  }

  return { empresaId: usuario.empresa_id, error: null };
}
