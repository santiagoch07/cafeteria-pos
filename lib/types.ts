/**
 * Tipos canónicos del modelo de datos.
 * Todas las tablas de negocio incluyen empresa_id (multi-tenant).
 * Excepción: tipos_gasto es catálogo global sin empresa_id.
 */

// ── Infraestructura multi-tenant ────────────────────────────

export type Empresa = {
  id: string;
  nombre: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type Rol = "dueno" | "cajero";

export type Usuario = {
  id: string;           // mismo que auth.users.id de Supabase Auth
  empresa_id: string;
  email: string;
  nombre: string | null;
  rol: Rol;
  created_at?: string;
};

// ── Catálogo de productos ────────────────────────────────────

export type Categoria = {
  id: string;
  empresa_id: string;
  nombre: string;
  created_at: string;
};

export type Producto = {
  id: string;
  empresa_id: string;
  nombre: string;
  precio: number;                   // centavos MXN
  costo: number;                    // centavos MXN
  categoria_id: string | null;
  categoria_nombre: string | null;  // campo virtual — join aplanado desde categorias
  disponible: boolean;
  created_at: string;
};

// ── Catálogo global (sin empresa_id) ────────────────────────

export type TipoGasto = {
  id: string;
  nombre: string;
  orden: number;
  created_at: string;
};

// ── Operaciones de caja ──────────────────────────────────────

export type Turno = {
  id: string;
  empresa_id: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
  efectivo_inicial: number;         // centavos MXN
  efectivo_final_sistema: number | null;
  efectivo_final_real: number | null;
  diferencia: number | null;
  notas: string | null;
  estado: "abierto" | "cerrado";
};

export type Orden = {
  id: string;
  empresa_id: string;
  fecha: string;
  total: number;                    // centavos MXN (subtotal + propina)
  propina: number;                  // centavos MXN
  metodo_pago: "efectivo" | "tarjeta";
  turno_id: string | null;
};

export type OrdenItem = {
  id: string;
  empresa_id: string;
  orden_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;          // centavos MXN al momento de la venta
};

// ── Finanzas ─────────────────────────────────────────────────

export type ProductoRanking = {
  producto_id: string;
  nombre: string;
  categoria_nombre: string | null;
  precio: number;                    // centavos MXN
  costo: number;                     // centavos MXN
  margen_unitario: number;           // precio - costo, centavos
  margen_porcentaje: number;         // (margen / precio) * 100, 1 decimal
  unidades_vendidas: number;
  ingreso_total: number;             // unidades * precio, centavos
  ganancia_total: number;            // unidades * margen_unitario, centavos
  participacion_ganancia: number;    // % sobre total_ganancia de todos los productos
  costo_no_capturado?: boolean;      // true si costo era null o 0
};

export type Gasto = {
  id: string;
  empresa_id: string;
  mes: number;                      // 1-12
  año: number;                      // >= 2024
  tipo_gasto_id: string;
  monto: number;                    // centavos MXN
  notas: string | null;
  created_at: string;
  updated_at: string;
  tipo?: TipoGasto;                 // embed opcional via .select('*, tipo:tipos_gasto(...)')
};
