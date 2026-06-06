import { getSupabase } from "./supabase";

export type TipoGastoVisible = {
  id: string;
  nombre: string;
  orden: number;
  es_base: boolean;
  activo: boolean;
  tipo_base_id: string | null;
  tipo_gasto_empresa_id: string | null;
  tipo_gasto_id: string | null;
};

/**
 * Retorna TODOS los tipos de gasto de una empresa (visibles y ocultos),
 * combinando los 9 base + overrides + custom.
 * El campo `activo` indica si aparece en la lista principal.
 * Ordenados por orden_custom (si hay) o por orden del base.
 */
export async function getTiposGastoVisibles(empresaId: string): Promise<TipoGastoVisible[]> {
  const supabase = getSupabase();

  const [{ data: base }, { data: personalizaciones }] = await Promise.all([
    supabase.from("tipos_gasto").select("*").eq("es_base", true).order("orden"),
    supabase.from("tipos_gasto_empresa").select("*").eq("empresa_id", empresaId),
  ]);

  const personalizacionesPorBase = new Map(
    (personalizaciones ?? [])
      .filter((p) => p.tipo_base_id)
      .map((p) => [p.tipo_base_id, p])
  );

  const baseFinal: TipoGastoVisible[] = (base ?? []).map((b) => {
    const override = personalizacionesPorBase.get(b.id);
    if (override) {
      return {
        id: override.id,
        nombre: override.nombre_custom ?? b.nombre,
        orden: override.orden_custom ?? b.orden,
        es_base: true,
        activo: override.activo,
        tipo_base_id: b.id,
        tipo_gasto_empresa_id: override.id,
        tipo_gasto_id: null,
      };
    }
    return {
      id: b.id,
      nombre: b.nombre,
      orden: b.orden,
      es_base: true,
      activo: true,
      tipo_base_id: null,
      tipo_gasto_empresa_id: null,
      tipo_gasto_id: b.id,
    };
  });

  const custom: TipoGastoVisible[] = (personalizaciones ?? [])
    .filter((p) => !p.tipo_base_id)
    .map((p) => ({
      id: p.id,
      nombre: p.nombre_custom!,
      orden: p.orden_custom ?? 999,
      es_base: false,
      activo: p.activo,
      tipo_base_id: null,
      tipo_gasto_empresa_id: p.id,
      tipo_gasto_id: null,
    }));

  return [...baseFinal, ...custom].sort((a, b) => a.orden - b.orden);
}
