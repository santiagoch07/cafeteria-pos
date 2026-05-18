const mxnFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

/** Formatea centavos MXN a string de moneda, ej: 1500 -> "$15.00" */
export function formatMXN(centavos: number): string {
  return mxnFormatter.format(centavos / 100);
}

/** Convierte pesos MXN a centavos para almacenar en DB, ej: 15.0 -> 1500 */
export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

const DIAS = [
  "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * Formatea "YYYY-MM-DD" → "lunes 18 de mayo"
 * Interpreta la fecha en hora local para evitar desfases UTC.
 */
export function formatFechaEspanol(fechaStr: string): string {
  const [year, month, day] = fechaStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return `${DIAS[d.getDay()]} ${day} de ${MESES[month - 1]}`;
}

/** Formatea "YYYY-MM-DD HH:MM:SS" → "HH:MM" */
export function formatHora(datetimeStr: string): string {
  return datetimeStr.slice(11, 16);
}

/** Calcula porcentaje de cambio; retorna null si no hay referencia */
export function pctCambio(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

/** "2026-05-18" → fecha de ayer / hace 7 días en formato YYYY-MM-DD */
export function fechaRelativa(base: string, dias: number): string {
  const [y, m, d] = base.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}
