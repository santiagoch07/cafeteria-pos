#!/usr/bin/env npx tsx
/**
 * seed-ventas.ts — Genera ~35 órdenes de prueba realistas para demos.
 * Uso: npm run seed:ventas
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ── Cargar variables de entorno desde .env.local ──────────────
function cargarEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const linea of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const l = linea.trim();
    if (!l || l.startsWith("#")) continue;
    const idx = l.indexOf("=");
    if (idx === -1) continue;
    const clave = l.slice(0, idx).trim();
    const valor = l.slice(idx + 1).trim();
    if (!process.env[clave]) process.env[clave] = valor;
  }
}
cargarEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("❌  Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

// ── Tipos ─────────────────────────────────────────────────────
type Producto = { id: string; nombre: string; precio: number };
type OrdenItem = { producto_id: string; cantidad: number; precio_unitario: number };

// ── Utilidades ────────────────────────────────────────────────
function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function alAzar<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function mezclar<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Crea un Date de hoy con la hora local indicada + offset aleatorio de minutos */
function fechaHoy(horaInicio: number, horaFin: number): Date {
  const duracionMin = (horaFin - horaInicio) * 60;
  const offsetMin   = rnd(1, duracionMin - 1);
  const d = new Date();
  d.setHours(horaInicio, 0, 0, 0);
  d.setMinutes(d.getMinutes() + offsetMin);
  return d;
}

// ── Configuración de franjas horarias ─────────────────────────
const SLOTS = [
  { inicio: 7,  fin: 10, count: 9,  maxItems: 2 },  // mañana temprano
  { inicio: 10, fin: 12, count: 7,  maxItems: 3 },  // media mañana
  { inicio: 12, fin: 14, count: 9,  maxItems: 3 },  // hora de comida
  { inicio: 14, fin: 18, count: 10, maxItems: 2 },  // tarde
];

// ── Lógica principal ──────────────────────────────────────────
async function main() {
  console.log("🌱  Iniciando seed de ventas…\n");

  // 1. Obtener productos disponibles
  const { data: productos, error: errProd } = await supabase
    .from("productos")
    .select("id, nombre, precio")
    .eq("disponible", true)
    .order("nombre");

  if (errProd) { console.error("❌  Error al obtener productos:", errProd.message); process.exit(1); }
  if (!productos?.length) { console.error("❌  No hay productos disponibles en la base de datos."); process.exit(1); }

  console.log(`✅  Productos encontrados: ${productos.map((p) => p.nombre).join(", ")}`);

  // 2. Obtener turno activo o crear uno
  const { data: turnoExistente } = await supabase
    .from("turnos")
    .select("id, efectivo_inicial")
    .eq("estado", "abierto")
    .limit(1)
    .maybeSingle();

  let turno_id: string;
  if (turnoExistente) {
    turno_id = turnoExistente.id;
    console.log(`✅  Turno activo encontrado: ${turno_id.slice(0, 8)}…`);
  } else {
    const { data: nuevoTurno, error: errTurno } = await supabase
      .from("turnos")
      .insert({ efectivo_inicial: 100000 }) // $1,000 MXN
      .select("id")
      .single();
    if (errTurno || !nuevoTurno) { console.error("❌  Error al crear turno:", errTurno?.message); process.exit(1); }
    turno_id = nuevoTurno.id;
    console.log(`✅  Turno creado con $1,000 de efectivo inicial: ${turno_id.slice(0, 8)}…`);
  }

  // 3. Generar y ordenar todas las marcas de tiempo del día
  const entradas: { fecha: Date; maxItems: number }[] = [];
  for (const slot of SLOTS) {
    for (let i = 0; i < slot.count; i++) {
      entradas.push({ fecha: fechaHoy(slot.inicio, slot.fin), maxItems: slot.maxItems });
    }
  }
  entradas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  console.log(`\n📦  Generando ${entradas.length} órdenes…\n`);

  // 4. Crear órdenes
  let creadas = 0, totalVendido = 0, totalEfectivo = 0, totalTarjeta = 0, totalPropinas = 0;

  for (const entrada of entradas) {
    const numItems = rnd(1, Math.min(entrada.maxItems, productos.length));
    const prodsSeleccionados: Producto[] = mezclar(productos as Producto[]).slice(0, numItems);

    const items: OrdenItem[] = prodsSeleccionados.map((p) => ({
      producto_id: p.id,
      cantidad:    Math.random() < 0.25 ? 2 : 1,  // 25% de prob de pedir 2
      precio_unitario: p.precio,
    }));

    const subtotal    = items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
    const metodo_pago = Math.random() < 0.6 ? "tarjeta" : "efectivo";

    // Propina: 30% de probabilidad, entre 10% y 20% del subtotal
    let propina = 0;
    if (Math.random() < 0.30) {
      const pct = rnd(10, 20);
      propina = Math.round(subtotal * pct / 100);
    }
    const total = subtotal + propina;

    // Insertar orden
    const { data: orden, error: errOrden } = await supabase
      .from("ordenes")
      .insert({ total, propina, metodo_pago, turno_id, fecha: entrada.fecha.toISOString() })
      .select("id")
      .single();

    if (errOrden || !orden) {
      console.error(`  ⚠️  Error al crear orden: ${errOrden?.message}`);
      continue;
    }

    // Insertar ítems en batch
    const { error: errItems } = await supabase
      .from("orden_items")
      .insert(items.map((i) => ({ ...i, orden_id: orden.id })));

    if (errItems) {
      // Rollback manual
      await supabase.from("ordenes").delete().eq("id", orden.id);
      console.error(`  ⚠️  Error al crear items (rollback): ${errItems.message}`);
      continue;
    }

    creadas++;
    totalVendido  += total;
    totalPropinas += propina;
    if (metodo_pago === "efectivo") totalEfectivo += total;
    else                             totalTarjeta  += total;

    // Indicador visual de progreso
    const hora  = entrada.fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    const prods = items.map((i) => {
      const p = productos.find((x) => x.id === i.producto_id);
      return i.cantidad > 1 ? `${i.cantidad}×${p?.nombre}` : p?.nombre;
    }).join(", ");
    console.log(
      `  ${hora}  ${metodo_pago === "tarjeta" ? "💳" : "💵"}  ${prods.padEnd(40)}  ` +
      `$${(total / 100).toFixed(2).padStart(7)}${propina ? ` (propina $${(propina / 100).toFixed(0)})` : ""}`
    );
  }

  // 5. Resumen final
  console.log(`
╔═══════════════════════════════════════╗
║           RESUMEN DEL SEED            ║
╠═══════════════════════════════════════╣
║  Órdenes creadas : ${String(creadas).padStart(3)} / ${String(entradas.length).padEnd(3)}           ║
║  Total vendido   : $${(totalVendido / 100).toFixed(2).padStart(10)}         ║
║    💵  Efectivo  : $${(totalEfectivo / 100).toFixed(2).padStart(10)}         ║
║    💳  Tarjeta   : $${(totalTarjeta / 100).toFixed(2).padStart(10)}         ║
║  Propinas        : $${(totalPropinas / 100).toFixed(2).padStart(10)}         ║
╚═══════════════════════════════════════╝
  `);
}

main().catch((err) => {
  console.error("❌  Error inesperado:", err);
  process.exit(1);
});
