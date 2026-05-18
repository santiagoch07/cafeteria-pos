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
