import { getSupabaseServer } from "./supabase-server";
import { NextResponse } from "next/server";

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
